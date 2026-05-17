import { sales } from "@/lib/api";

// These thin wrappers preserve the previous module surface (consumed by SettingsPage)
// while sending requests through the Laravel sales API instead of Supabase server functions.

export type CreateSalesUserInput = {
  // access_token is accepted but ignored — the sales API client attaches the Sanctum token automatically.
  access_token?: string;
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "executive" | string;
  default_course_id?: string | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
};

export async function createSalesUser(input: CreateSalesUserInput): Promise<{ ok: true; id: string }> {
  const created = await sales.salesUsers.create({
    email: input.email,
    password: input.password,
    full_name: input.full_name,
    role: input.role,
    is_active: true,
    default_course_id: input.default_course_id ?? null,
    working_hours_start: input.working_hours_start ?? null,
    working_hours_end: input.working_hours_end ?? null,
  });
  return { ok: true, id: created.id };
}

export type SetSalesUserPasswordInput = {
  access_token?: string;
  user_id: string;
  password: string;
};

export async function setSalesUserPassword(input: SetSalesUserPasswordInput): Promise<{ ok: true }> {
  await sales.salesUsers.update(input.user_id, { password: input.password });
  return { ok: true };
}
