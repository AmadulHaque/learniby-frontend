import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function requireAdmin(token: string | undefined): Promise<string> {
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const { data: u, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !u.user) throw new Response("Unauthorized", { status: 401 });
  const { data: row } = await supabaseAdmin
    .from("sales_users")
    .select("role,is_active")
    .eq("id", u.user.id)
    .maybeSingle();
  if (!row || row.role !== "admin" || !row.is_active) throw new Response("Forbidden", { status: 403 });
  return u.user.id;
}

export const createSalesUser = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      access_token: string;
      email: string;
      password: string;
      full_name: string;
      role: "admin" | "executive";
      default_course_id?: string | null;
      working_hours_start?: string | null;
      working_hours_end?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.access_token);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Response(error?.message ?? "Create failed", { status: 400 });

    const { error: insErr } = await supabaseAdmin.from("sales_users").insert({
      id: created.user.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      is_active: true,
      default_course_id: data.default_course_id ?? null,
      working_hours_start: data.working_hours_start ?? null,
      working_hours_end: data.working_hours_end ?? null,
    });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Response(insErr.message, { status: 400 });
    }
    return { ok: true, id: created.user.id };
  });

export const setSalesUserPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { access_token: string; user_id: string; password: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.access_token);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

