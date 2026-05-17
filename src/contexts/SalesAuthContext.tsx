import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, getToken, salesLogin, salesLogout, salesMe, type ApiSalesUser } from "@/lib/api";

export type SalesRole = "admin" | "manager" | "executive";

// Surface kept compatible with the previous Supabase-backed shape so existing
// consumers (sales pages + permission helpers) continue to type-check.
// `rolePermissions` is now always `[]` because the backend already merges
// role-level and user-level permissions into `permissions`.
export interface SalesUser {
  id: string;
  email: string;
  full_name: string;
  role: SalesRole;
  is_active: boolean;
  phone: string | null;
  permissions: string[];
  avatar_url: string | null;
  designation: string | null;
  rolePermissions: string[];
}

export interface SalesSession {
  access_token: string;
}

export interface SalesAuthUser {
  id: string;
  email: string;
}

interface SalesAuthCtx {
  loading: boolean;
  session: SalesSession | null;
  authUser: SalesAuthUser | null;
  salesUser: SalesUser | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SalesAuthCtx | null>(null);

function toSalesUser(api: ApiSalesUser): SalesUser {
  return {
    id: api.id,
    email: api.email,
    full_name: api.full_name,
    role: api.role,
    is_active: api.is_active,
    phone: api.phone,
    permissions: api.permissions ?? [],
    avatar_url: api.avatar_url,
    designation: api.designation,
    rolePermissions: [],
  };
}

function sessionFromToken(token: string | null): SalesSession | null {
  return token ? { access_token: token } : null;
}

export function SalesAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SalesSession | null>(null);
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);

  const applyUser = useCallback((api: ApiSalesUser | null) => {
    setSalesUser(api ? toSalesUser(api) : null);
    setSession(sessionFromToken(getToken("sales")));
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getToken("sales")) {
      applyUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await salesMe();
      applyUser(me.is_active ? me : null);
    } catch {
      applyUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signIn: SalesAuthCtx["signIn"] = async (email, password, remember) => {
    try {
      const res = await salesLogin(email.trim(), password, remember);
      if (!res.user.is_active) {
        return { error: "এই অ্যাকাউন্টের Sales Panel-এ অ্যাক্সেস নেই।" };
      }
      applyUser(res.user);
      return {};
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldErr = e.firstFieldError();
        return { error: fieldErr ?? e.message };
      }
      return { error: "Login failed. Please try again." };
    }
  };

  const signOut = async () => {
    try {
      await salesLogout();
    } finally {
      applyUser(null);
    }
  };

  const refresh = async () => {
    if (!getToken("sales")) {
      applyUser(null);
      return;
    }
    try {
      const me = await salesMe();
      applyUser(me.is_active ? me : null);
    } catch {
      applyUser(null);
    }
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        authUser: salesUser ? { id: salesUser.id, email: salesUser.email } : null,
        salesUser,
        signIn,
        signOut,
        refresh,
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
