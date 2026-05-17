// Shared types mirroring Laravel API resources.
// Keep this file in sync with backend resources at:
//   - backend/app/Http/Resources/Api/V1/UserResource.php
//   - backend/app/Http/Resources/Api/V1/SalesUserResource.php

export type UserRole = "admin" | "teacher" | "student";

export interface UserProfile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  institution: string | null;
  status: string | null;
  student_id: string | null;
  batch_number: string | null;
  is_master: boolean;
}

export interface ApiUser {
  id: string;
  email: string;
  email_verified_at: string | null;
  roles: UserRole[];
  highest_role: UserRole | null;
  profile: UserProfile | null;
  created_at: string | null;
  updated_at: string | null;
}

export type SalesRole = "admin" | "manager" | "executive";

export interface ApiSalesUser {
  id: string;
  email: string;
  full_name: string;
  role: SalesRole;
  is_active: boolean;
  phone: string | null;
  default_course_id: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  permissions: string[];
  avatar_url: string | null;
  designation: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LoginResponse<TUser> {
  user: TUser;
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  refresh_expires_at: string;
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  fieldErrors(): Record<string, string[]> {
    return this.body?.errors ?? {};
  }

  firstFieldError(): string | null {
    const errs = this.body?.errors;
    if (!errs) return null;
    for (const k of Object.keys(errs)) {
      const arr = errs[k];
      if (arr && arr.length) return arr[0];
    }
    return null;
  }
}
