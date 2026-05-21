import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, apiPost, ApiError, tokenStore } from "@/lib/api";

export type Role = "admin" | "manager" | "teacher" | "student" | null;

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
  roles: string[];
  highest_role: Role;
  profile: UserProfile | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LoginResponse {
  user: ApiUser;
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  refresh_expires_at: string;
}

/** Compatibility shim — old code expects a Supabase-style `session.access_token`. */
export interface SessionShim {
  access_token: string;
  user: { id: string; email: string };
}

interface AuthCtx {
  user: ApiUser | null;
  session: SessionShim | null;
  role: Role;
  isMaster: boolean;
  isAdminLike: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Alias for refresh() to match old API. */
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function resolveRole(user: ApiUser | null): Role {
  if (!user) return null;
  const roles = user.roles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("student")) return "student";
  return (user.highest_role as Role) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  const fetchMe = async () => {
    try {
      const me = await api<ApiUser>({ path: "/auth/me", audience: "user" });
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        setUser(null);
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
        if (tokenStore.token && tokenStore.audience === "user") {
          await fetchMe();
        } else if (!tokenStore.token) {
          // Attempt silent refresh via cookie (works if user already logged in elsewhere)
          // Skip if a sales session is active to avoid stealing audience.
          if (tokenStore.audience === null || tokenStore.audience === "user") {
            try {
              const data = await api<LoginResponse>({
                method: "POST",
                path: "/auth/refresh",
                audience: "user",
                skipAuth: true,
                skipRefresh: true,
              });
              tokenStore.set({
                accessToken: data.access_token,
                expiresAt: data.expires_at,
                audience: "user",
              });
              setUser(data.user);
            } catch {
              /* no session — fine */
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    try {
      const data = await apiPost<LoginResponse>("/auth/login", { email, password });
      tokenStore.set({
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        audience: "user",
      });
      setUser(data.user);
      return {};
    } catch (e) {
      if (e instanceof ApiError) {
        const firstField = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
        return { error: firstField || e.message || "Login failed." };
      }
      return { error: "Network error. Please try again." };
    }
  };

  const signOut = async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
  };

  const refresh = async () => {
    if (!tokenStore.token) return;
    await fetchMe();
  };

  const role = resolveRole(user);
  const isMaster = !!user?.profile?.is_master;
  const isAdminLike = role === "admin" || role === "manager" || role === "teacher";

  const session: SessionShim | null =
    user && tokenStore.token
      ? { access_token: tokenStore.token, user: { id: user.id, email: user.email } }
      : null;

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        isMaster,
        isAdminLike,
        loading,
        signIn,
        signOut,
        refresh,
        refreshRole: refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
