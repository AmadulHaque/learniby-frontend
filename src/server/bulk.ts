import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit.server";

const SUPABASE_URL = "https://tqydqebwrfqazkoidxbh.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWRxZWJ3cmZxYXprb2lkeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTM2MDQsImV4cCI6MjA5MjQyOTYwNH0.hseWwWb8Bh1gG7RB6U0_WEi9A535zSUB2Qin-BsJ1_w";

async function getUserId(token: string): Promise<string> {
  const c = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await c.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}
async function assertAdmin(token: string): Promise<string> {
  const uid = await getUserId(token);
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", uid);
  const ok = (roles ?? []).some((r) => r.role === "admin" || r.role === "teacher");
  if (!ok) throw new Error("Admin access required");
  return uid;
}

// ---- List students of a batch (for bulk grant picker) ----
export const adminListBatchStudents = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; batchNumber: string }) => input)
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, student_id, batch_number")
      .eq("status", "approved")
      .eq("batch_number", data.batchNumber.trim());
    return { students: rows ?? [] };
  });

// ---- List all distinct batch numbers (from approved students) ----
export const adminListBatches = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => input)
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("batch_number")
      .eq("status", "approved")
      .not("batch_number", "is", null);
    const counts = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      const b = (r.batch_number ?? "").trim();
      if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
    });
    return {
      batches: [...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
        .map(([batch, count]) => ({ batch, count })),
    };
  });

// ---- Bulk grant a course's videos (or specific module's) to a batch ----
export const adminBulkGrantBatch = createServerFn({ method: "POST" })
  .inputValidator((input: {
    accessToken: string;
    batchNumber: string;
    courseId: string;
    moduleId?: string; // optional — if set, only that module's videos
    studentIds?: string[]; // optional override; if absent we use entire batch
  }) => input)
  .handler(async ({ data }) => {
    const adminId = await assertAdmin(data.accessToken);

    // Collect target videos
    const modQ = supabaseAdmin.from("modules").select("id").eq("course_id", data.courseId);
    const { data: mods } = data.moduleId ? await modQ.eq("id", data.moduleId) : await modQ;
    const modIds = (mods ?? []).map((m) => m.id);
    if (modIds.length === 0) return { granted: 0, students: 0, videos: 0 };

    const { data: vids } = await supabaseAdmin
      .from("videos")
      .select("id")
      .in("module_id", modIds);
    const videoIds = (vids ?? []).map((v) => v.id);
    if (videoIds.length === 0) return { granted: 0, students: 0, videos: 0 };

    // Collect target students
    let studentIds = data.studentIds ?? [];
    if (studentIds.length === 0) {
      const { data: studs } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("status", "approved")
        .eq("batch_number", data.batchNumber.trim());
      studentIds = (studs ?? []).map((s) => s.id);
    }
    if (studentIds.length === 0) return { granted: 0, students: 0, videos: videoIds.length };

    // Fetch existing rows for diff
    const { data: existing } = await supabaseAdmin
      .from("video_access")
      .select("user_id, video_id")
      .in("user_id", studentIds)
      .in("video_id", videoIds);
    const have = new Set((existing ?? []).map((r) => `${r.user_id}|${r.video_id}`));

    const toInsert: { user_id: string; video_id: string; granted_by: string }[] = [];
    for (const uid of studentIds) {
      for (const vid of videoIds) {
        if (!have.has(`${uid}|${vid}`)) {
          toInsert.push({ user_id: uid, video_id: vid, granted_by: adminId });
        }
      }
    }

    if (toInsert.length) {
      // Chunk to avoid huge inserts
      const CHUNK = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const slice = toInsert.slice(i, i + CHUNK);
        const { error } = await supabaseAdmin.from("video_access").insert(slice);
        if (error) throw new Error(error.message);
      }
    }

    await logAudit({
      actorId: adminId,
      action: "bulk_grant_batch",
      targetType: "course",
      targetId: data.courseId,
      meta: {
        batch: data.batchNumber,
        moduleId: data.moduleId ?? null,
        students: studentIds.length,
        videos: videoIds.length,
        newGrants: toInsert.length,
      },
    });

    return {
      granted: toInsert.length,
      students: studentIds.length,
      videos: videoIds.length,
    };
  });

// ---- Audit log reader ----
export const adminAuditList = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    await assertAdmin(data.accessToken);
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 500);
    const { data: rows } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, actor_id, action, target_type, target_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    const ids = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[])];
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email || p.id.slice(0, 8)]));
    }
    return {
      entries: (rows ?? []).map((r) => ({
        ...r,
        actor_name: r.actor_id ? nameMap.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "system",
      })),
    };
  });
