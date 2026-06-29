import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, apiPost, ApiError, tokenStore } from "@/lib/api";

export type SalesRole = "admin" | "manager" | "executive";

export interface SalesUser {
  id: string;
  email: string;
  full_name: string;
  role: SalesRole;
  is_active: boolean;
  phone: string | null;
  default_course_id: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  /** Effective permission set already merged on the server (role ∪ user-level). */
  permissions: string[];
  /** Kept for backward compatibility with hasPermission(); always [] now. */
  rolePermissions: string[];
  avatar_url: string | null;
  designation: string | null;
}

interface LoginResponse {
  user: Omit<SalesUser, "rolePermissions">;
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  refresh_expires_at: string;
}

export interface SalesSessionShim {
  access_token: string;
  user: { id: string; email: string };
}

interface SalesAuthCtx {
  loading: boolean;
  salesUser: SalesUser | null;
  /** Compatibility shims — old code reads `authUser`/`session`. */
  authUser: { id: string; email: string } | null;
  session: SalesSessionShim | null;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<SalesUser, "full_name" | "phone" | "designation" | "avatar_url">>) => Promise<{ error?: string }>;
  updatePassword: (current: string, next: string) => Promise<{ error?: string }>;
  uploadAvatar: (file: File) => Promise<{ error?: string }>;
  removeAvatar: () => Promise<{ error?: string }>;
}

const Ctx = createContext<SalesAuthCtx | null>(null);

function shapeUser(u: Omit<SalesUser, "rolePermissions"> | null): SalesUser | null {
  if (!u) return null;
  return { ...u, permissions: u.permissions ?? [], rolePermissions: [] };
}

export function SalesAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const bootstrapped = useRef(false);

  const fetchMe = async () => {
    try {
      const me = await api<Omit<SalesUser, "rolePermissions">>({
        path: "/sales/auth/me",
        audience: "sales",
      });
      setSalesUser(shapeUser(me));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        setSalesUser(null);
      } else {
        throw e;
      }
    }
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        if (tokenStore.token && tokenStore.audience === "sales") {
          await fetchMe();
        } else if (!tokenStore.token) {
          if (tokenStore.audience === null || tokenStore.audience === "sales") {
            try {
              const data = await api<LoginResponse>({
                method: "POST",
                path: "/sales/auth/refresh",
                audience: "sales",
                skipAuth: true,
                skipRefresh: true,
              });
              tokenStore.set({
                accessToken: data.access_token,
                expiresAt: data.expires_at,
                audience: "sales",
              });
              setSalesUser(shapeUser(data.user));
            } catch {
              /* no session */
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn: SalesAuthCtx["signIn"] = async (email, password) => {
    try {
      const data = await apiPost<LoginResponse>("/sales/auth/login", {
        email: email.trim(),
        password,
      });
      if (!data.user.is_active) {
        return { error: "এই অ্যাকাউন্ট সক্রিয় নয়।" };
      }
      tokenStore.set({
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        audience: "sales",
      });
      setSalesUser(shapeUser(data.user));
      return {};
    } catch (e) {
      if (e instanceof ApiError) {
        const firstField = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
        return { error: firstField || e.message || "Login failed." };
      }
      return { error: "Network error." };
    }
  };

  const signOut = async () => {
    try {
      await apiPost("/sales/auth/logout");
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setSalesUser(null);
  };

  const refresh = async () => {
    if (tokenStore.token) await fetchMe();
  };

  const updateProfile: SalesAuthCtx["updateProfile"] = async (patch) => {
    try {
      const updated = await api<Omit<SalesUser, "rolePermissions">>({
        method: "PATCH",
        path: "/sales/auth/profile",
        body: patch,
        audience: "sales",
      });
      setSalesUser(shapeUser(updated));
      return {};
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : "Update failed." };
    }
  };

  const updatePassword: SalesAuthCtx["updatePassword"] = async (current, next) => {
    try {
      await api({
        method: "PUT",
        path: "/sales/auth/password",
        body: { current_password: current, password: next, password_confirmation: next },
        audience: "sales",
      });
      return {};
    } catch (e) {
      if (e instanceof ApiError) {
        const firstField = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
        return { error: firstField || e.message };
      }
      return { error: "Password update failed." };
    }
  };

  const uploadAvatar: SalesAuthCtx["uploadAvatar"] = async (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const updated = await api<Omit<SalesUser, "rolePermissions">>({
        method: "POST",
        path: "/sales/auth/avatar",
        formData: fd,
        audience: "sales",
      });
      setSalesUser(shapeUser(updated));
      return {};
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : "Upload failed." };
    }
  };

  const removeAvatar: SalesAuthCtx["removeAvatar"] = async () => {
    try {
      const updated = await api<Omit<SalesUser, "rolePermissions">>({
        method: "DELETE",
        path: "/sales/auth/avatar",
        audience: "sales",
      });
      setSalesUser(shapeUser(updated));
      return {};
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : "Remove failed." };
    }
  };

  const authUser = salesUser ? { id: salesUser.id, email: salesUser.email } : null;
  const session: SalesSessionShim | null =
    salesUser && tokenStore.token
      ? { access_token: tokenStore.token, user: { id: salesUser.id, email: salesUser.email } }
      : null;

  return (
    <Ctx.Provider
      value={{
        loading,
        salesUser,
        authUser,
        session,
        signIn,
        signOut,
        refresh,
        updateProfile,
        updatePassword,
        uploadAvatar,
        removeAvatar,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSalesAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSalesAuth must be used inside <SalesAuthProvider>");
  return v;
}
