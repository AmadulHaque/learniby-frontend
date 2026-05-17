import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  requested_role: "student" | "teacher";
  address?: string;
  institution?: string;
  student_id?: string;
  batch_number?: string;
};

// Public signup — uses service_role admin.createUser with email_confirm:true
// so NO confirmation email is sent (avoids Supabase email rate limits).
// Profile row is created by DB trigger; we patch extra fields after.
export const publicRegister = createServerFn({ method: "POST" })
  .inputValidator((input: RegisterInput) => {
    if (!input.email || !input.password || !input.full_name) {
      throw new Error("ইমেইল, পাসওয়ার্ড ও নাম আবশ্যক");
    }
    if (input.password.length < 6) throw new Error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
    return input;
  })
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();

    // Create user with email already confirmed → no email is sent
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone,
        requested_role: data.requested_role,
        address: data.address ?? null,
        institution: data.institution ?? null,
        student_id: data.student_id ?? null,
        batch_number: data.batch_number ?? null,
      },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "একাউন্ট তৈরি ব্যর্থ";
      // Friendly Bengali for common cases
      if (/already registered|already exists|duplicate/i.test(msg)) {
        throw new Error("এই ইমেইল দিয়ে আগে রেজিস্ট্রেশন করা হয়েছে");
      }
      throw new Error(msg);
    }

    const uid = created.user.id;

    // Patch profile with full info (trigger creates a base row, but may not include all fields)
    await supabaseAdmin
      .from("profiles")
      .update({
        email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        address: data.address ?? null,
        institution: data.institution ?? null,
        student_id: data.student_id ?? null,
        batch_number: data.batch_number ?? null,
        requested_role: data.requested_role,
        status: "pending",
      })
      .eq("id", uid);

    return { ok: true, userId: uid };
  });
