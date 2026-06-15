import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tqydqebwrfqazkoidxbh.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWRxZWJ3cmZxYXprb2lkeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTM2MDQsImV4cCI6MjA5MjQyOTYwNH0.hseWwWb8Bh1gG7RB6U0_WEi9A535zSUB2Qin-BsJ1_w";

function createClientFn(_opts: { method: "GET" | "POST" }) {
  return {
    inputValidator<TInput>(validator: (input: TInput) => TInput) {
      return {
        handler<TResult>(fn: (args: { data: TInput }) => Promise<TResult>) {
          return async (args: { data: TInput }) => fn({ data: validator(args.data) });
        },
      };
    },
  };
}

async function logAudit(opts: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  await supabase.from("admin_audit_log").insert({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    meta: opts.meta ?? {},
  });
}

async function getUserId(accessToken: string): Promise<string> {
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

// Admin / manager / teacher — all can manage content/students
async function assertAdmin(accessToken: string): Promise<string> {
  const uid = await getUserId(accessToken);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  const has = (roles ?? []).some(
    (r) => r.role === "admin" || r.role === "manager" || r.role === "teacher",
  );
  if (!has) throw new Error("Admin access required");
  return uid;
}

// Master admin only — for teacher management & sensitive ops
async function assertMaster(accessToken: string): Promise<string> {
  const uid = await getUserId(accessToken);
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_master")
    .eq("id", uid)
    .maybeSingle();
  if (!profile?.is_master) throw new Error("Master admin access required");
  return uid;
}

// ---- Students list (with status) — excludes admins/teachers ----
export const adminListStudents = createClientFn({ method: "POST" })
  .inputValidator(
    (input: {
      accessToken: string;
      status?: "pending" | "approved" | "rejected" | "ip_locked" | "all";
      roleFilter?: "student" | "teacher";
    }) => input,
  )
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);
    let q = supabase
      .from("profiles")
      .select(
        "id,email,full_name,phone,address,institution,student_id,batch_number,status,created_at,approved_at,locked_ip,last_attempted_ip,last_attempt_at,ip_locked_at,requested_role,is_master",
      )
      .order("created_at", { ascending: false });
    if (data.status === "pending") {
      q = q.in("status", ["pending", "ip_locked"]);
    } else if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const roleByUser = new Map<string, string[]>();
    (roleRows ?? []).forEach((r: any) => {
      const arr = roleByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      roleByUser.set(r.user_id, arr);
    });

    const wantTeachers = data.roleFilter === "teacher";
    const filtered = (rows ?? [])
      .filter((r) => {
        const userRoles = roleByUser.get(r.id) ?? [];
        const isAdmin = userRoles.includes("admin") || (r as any).is_master;
        const isTeacher = userRoles.includes("teacher");
        const isTeacherRequest = (r as any).requested_role === "teacher";

        if (wantTeachers) {
          // teachers tab — approved teachers OR pending teacher requests
          if (isAdmin) return false;
          if (data.status === "pending") return isTeacherRequest;
          return isTeacher;
        }
        // students tab — exclude all admins/teachers and teacher-requests
        if (isAdmin || isTeacher) return false;
        if (data.status === "pending" && isTeacherRequest) return false;
        return true;
      })
      .map((r) => ({ ...r, roles: roleByUser.get(r.id) ?? [] }));

    return { students: filtered };
  });

// ---- Approve / Reject ----
export const adminSetStudentStatus = createClientFn({ method: "POST" })
  .inputValidator(
    (input: { accessToken: string; userId: string; status: "approved" | "rejected" | "pending" }) =>
      input,
  )
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);

    // Check if this user is a teacher request — only master can approve those
    const { data: prof } = await supabase
      .from("profiles")
      .select("requested_role")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.requested_role === "teacher" && data.status === "approved") {
      // require master
      const { data: me } = await supabase
        .from("profiles")
        .select("is_master")
        .eq("id", adminId)
        .maybeSingle();
      if (!me?.is_master) throw new Error("শিক্ষক অনুমোদন শুধু মাস্টার অ্যাডমিন করতে পারবেন");
    }

    const patch: any = { status: data.status };
    if (data.status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = adminId;
      patch.locked_ip = null;
      patch.ip_locked_at = null;
    }
    const { error } = await supabase.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);

    // If approving a teacher request, grant teacher role
    if (prof?.requested_role === "teacher" && data.status === "approved") {
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "teacher" }, { onConflict: "user_id,role" });
    }

    await logAudit({
      actorId: adminId,
      action:
        data.status === "approved"
          ? "approve_user"
          : data.status === "rejected"
            ? "reject_user"
            : "set_status_pending",
      targetType: "user",
      targetId: data.userId,
      meta: { wasTeacherRequest: prof?.requested_role === "teacher" },
    });
    return { ok: true };
  });

// ---- Teacher: revoke teacher role (master only) ----
export const adminRevokeTeacher = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; userId: string }) => input)
  .handler(async ({ data }) => {
    await assertMaster(data.accessToken);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "teacher");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Teacher: directly create (master only) ----
export const adminCreateTeacher = createClientFn({ method: "POST" })
  .inputValidator(
    (input: {
      accessToken: string;
      email: string;
      password: string;
      full_name: string;
      phone?: string;
    }) => {
      if (!input.email?.includes("@")) throw new Error("সঠিক ইমেইল দিন");
      if (!input.password || input.password.length < 6) throw new Error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
      if (!input.full_name?.trim()) throw new Error("নাম দিন");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const masterId = await assertMaster(data.accessToken);
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone ?? "" },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "তৈরি করা যায়নি");

    await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? null,
        requested_role: "teacher",
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: masterId,
      })
      .eq("id", created.user.id);

    await supabase
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "teacher" }, { onConflict: "user_id,role" });

    return { ok: true, userId: created.user.id };
  });

// ---- Create student (admin manually adds) ----
export const adminCreateStudent = createClientFn({ method: "POST" })
  .inputValidator(
    (input: {
      accessToken: string;
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      address?: string;
      institution?: string;
      student_id?: string;
      batch_number?: string;
      autoApprove?: boolean;
    }) => {
      if (!input.email || !input.email.includes("@")) throw new Error("সঠিক ইমেইল দিন");
      if (!input.password || input.password.length < 6) throw new Error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
      if (!input.full_name?.trim()) throw new Error("নাম দিন");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);

    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone ?? "",
        address: data.address ?? "",
        institution: data.institution ?? "",
        student_id: data.student_id ?? "",
        batch_number: data.batch_number ?? "",
      },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "তৈরি করা যায়নি");

    // Trigger profiles row বানায়, কিন্তু ensure & auto-approve
    const patch: any = {
      full_name: data.full_name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      institution: data.institution ?? null,
      student_id: data.student_id?.trim() || null,
      batch_number: data.batch_number?.trim() || null,
    };
    if (data.autoApprove !== false) {
      patch.status = "approved";
      patch.approved_at = new Date().toISOString();
      patch.approved_by = adminId;
    }
    await supabase.from("profiles").update(patch).eq("id", created.user.id);

    return { ok: true, userId: created.user.id };
  });

// ---- Delete student ----
export const adminDeleteStudent = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; userId: string }) => input)
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);
    const { error } = await supabase.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: adminId,
      action: "delete_user",
      targetType: "user",
      targetId: data.userId,
    });
    return { ok: true };
  });

// ---- Reset password ----
export const adminResetPassword = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; userId: string; newPassword: string }) => {
    if (input.newPassword.length < 6) throw new Error("Password must be at least 6 chars");
    return input;
  })
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);
    const { error } = await supabase.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: adminId,
      action: "reset_password",
      targetType: "user",
      targetId: data.userId,
    });
    return { ok: true };
  });

// ---- Get student's full course tree + assigned videos ----
export const adminGetStudentAccess = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; userId: string }) => input)
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);

    const { data: courses } = await supabase
      .from("courses")
      .select("id,title,sort_order")
      .order("sort_order");

    const { data: modules } = await supabase
      .from("modules")
      .select("id,course_id,title,sort_order")
      .order("sort_order");

    const { data: videos } = await supabase
      .from("videos")
      .select("id,module_id,title,sort_order")
      .order("sort_order");

    const { data: access } = await supabase
      .from("video_access")
      .select("video_id")
      .eq("user_id", data.userId);

    const assigned = new Set((access ?? []).map((a) => a.video_id));

    const tree = (courses ?? []).map((c) => {
      const mods = (modules ?? [])
        .filter((m) => m.course_id === c.id)
        .map((m) => {
          const vids = (videos ?? [])
            .filter((v) => v.module_id === m.id)
            .map((v) => ({
              id: v.id,
              title: v.title,
              assigned: assigned.has(v.id),
            }));
          return { id: m.id, title: m.title, videos: vids };
        });
      return {
        id: c.id,
        title: c.title,
        modules: mods,
        totalVideos: mods.reduce((n, m) => n + m.videos.length, 0),
        assignedCount: mods.reduce((n, m) => n + m.videos.filter((v) => v.assigned).length, 0),
      };
    });

    return { tree };
  });

// ---- Bulk update video access for a student ----
export const adminSetVideoAccess = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; userId: string; videoIds: string[] }) => input)
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);

    // Current access
    const { data: current } = await supabase
      .from("video_access")
      .select("video_id")
      .eq("user_id", data.userId);
    const currentSet = new Set((current ?? []).map((c) => c.video_id));
    const targetSet = new Set(data.videoIds);

    const toAdd = [...targetSet].filter((id) => !currentSet.has(id));
    const toRemove = [...currentSet].filter((id) => !targetSet.has(id));

    if (toAdd.length) {
      const rows = toAdd.map((video_id) => ({
        user_id: data.userId,
        video_id,
        granted_by: adminId,
      }));
      const { error } = await supabase.from("video_access").insert(rows);
      if (error) throw new Error(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from("video_access")
        .delete()
        .eq("user_id", data.userId)
        .in("video_id", toRemove);
      if (error) throw new Error(error.message);
    }

    if (toAdd.length || toRemove.length) {
      await logAudit({
        actorId: adminId,
        action: "set_video_access",
        targetType: "user",
        targetId: data.userId,
        meta: { added: toAdd.length, removed: toRemove.length },
      });
    }
    return { added: toAdd.length, removed: toRemove.length };
  });

// ---- Dashboard stats ----
export const adminStats = createClientFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => input)
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);
    const [{ count: pending }, { count: approved }, { count: courses }, { count: videos }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("videos").select("*", { count: "exact", head: true }),
      ]);
    return {
      pending: pending ?? 0,
      approved: approved ?? 0,
      courses: courses ?? 0,
      videos: videos ?? 0,
    };
  });
