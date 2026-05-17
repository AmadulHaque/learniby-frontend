import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, getToken, userLogin, userLogout, userMe, type ApiUser } from "@/lib/api";

export type Role = "admin" | "teacher" | "student" | null;

// Lightweight session shape — exposes only what the rest of the app reads.
// Kept as a stable surface so existing consumers that destructure
// `session.access_token` continue to type-check during the migration.
export interface ApiSession {
  access_token: string;
}

interface AuthCtx {
  user: ApiUser | null;
  session: ApiSession | null;
  role: Role;
  isMaster: boolean;
  isAdminLike: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function deriveRole(roles: string[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("student")) return "student";
  return null;
}

function sessionFromToken(token: string | null): ApiSession | null {
  return token ? { access_token: token } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u: ApiUser | null) => {
    setUser(u);
    setSession(sessionFromToken(getToken("user")));
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getToken("user")) {
      applyUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await userMe();
      applyUser(me);
    } catch {
      // Token invalid / expired beyond refresh — client already cleared it.
      applyUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    try {
      const res = await userLogin(email, password);
      applyUser(res.user);
      return {};
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldErr = e.firstFieldError();
        if (e.status === 423) {
          return {
            error:
              "নিরাপত্তার জন্য আপনার একাউন্ট নতুন IP থেকে লগইনের কারণে লক করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।",
          };
        }
        return { error: fieldErr ?? e.message };
      }
      return { error: "লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" };
    }
  };

  const signOut = async () => {
    try {
      await userLogout();
    } finally {
      applyUser(null);
    }
  };

  const refreshRole = async () => {
    if (!getToken("user")) return;
    try {
      const me = await userMe();
      applyUser(me);
    } catch {
      applyUser(null);
    }
  };

  const role = deriveRole(user?.roles ?? []);
  const isMaster = !!user?.profile?.is_master;
  const isAdminLike = role === "admin" || role === "teacher";

  return (
    <Ctx.Provider value={{ user, session, role, isMaster, isAdminLike, loading, signIn, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
