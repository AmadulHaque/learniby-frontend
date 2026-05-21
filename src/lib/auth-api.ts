import { apiPost, ApiError } from "@/lib/api";

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

interface RegisterPayload {
  data: RegisterInput;
}

interface RegisterResult {
  ok: true;
  userId: string;
}

/**
 * Public signup — POSTs to Laravel /api/v1/auth/register.
 * User lands in `status=pending` until an admin approves them.
 */
export async function publicRegister({ data }: RegisterPayload): Promise<RegisterResult> {
  if (!data.email || !data.password || !data.full_name) {
    throw new Error("ইমেইল, পাসওয়ার্ড ও নাম আবশ্যক");
  }
  if (data.password.length < 6) {
    throw new Error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
  }

  try {
    const res = await apiPost<{ message: string; user_id: string }>("/auth/register", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      full_name: data.full_name,
      phone: data.phone || null,
      requested_role: data.requested_role,
      address: data.address ?? null,
      institution: data.institution ?? null,
      student_id: data.student_id ?? null,
      batch_number: data.batch_number ?? null,
    });
    return { ok: true, userId: res.user_id };
  } catch (e) {
    if (e instanceof ApiError) {
      const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
      throw new Error(first || e.message || "একাউন্ট তৈরি ব্যর্থ");
    }
    throw new Error("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন");
  }
}
