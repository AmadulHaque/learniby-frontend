import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SalesRole = "admin" | "executive";

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

interface SalesAuthCtx {
  loading: boolean;
  session: Session | null;
  authUser: User | null;
  salesUser: SalesUser | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SalesAuthCtx | null>(null);

export function SalesAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);

  const fetchSalesUser = async (uid: string | undefined) => {
    if (!uid) {
      setSalesUser(null);
      return;
    }
    const { data, error } = await supabase
      .from("sales_users")
      .select("id, email, full_name, role, is_active, phone, permissions, avatar_url, designation")
      .eq("id", uid)
      .maybeSingle();
    if (error || !data || !data.is_active) {
      setSalesUser(null);
      return;
    }
    const { data: rp } = await supabase
      .from("sales_role_permissions")
      .select("permissions")
      .eq("role", (data as { role: string }).role)
      .maybeSingle();
    setSalesUser({
      ...(data as Omit<SalesUser, "rolePermissions">),
      permissions: (data as SalesUser).permissions ?? [],
      rolePermissions: (rp?.permissions as string[] | null) ?? [],
    });
  };

  useEffect(() => {
    let mounted = true;

    // Set up listener BEFORE getSession (per Supabase docs)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      // Defer DB lookup to avoid deadlock inside listener
      setTimeout(() => {
        if (mounted) fetchSalesUser(sess?.user?.id);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      await fetchSalesUser(sess?.user?.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: SalesAuthCtx["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };

    // Verify sales_users membership
    const { data: row } = await supabase
      .from("sales_users")
      .select("id, email, full_name, role, is_active, phone, permissions, avatar_url, designation")
      .eq("id", data.user!.id)
      .maybeSingle();

    if (!row || !row.is_active) {
      await supabase.auth.signOut();
      return { error: "এই অ্যাকাউন্টের Sales Panel-এ অ্যাক্সেস নেই।" };
    }
    await fetchSalesUser(data.user!.id);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSalesUser(null);
  };

  const refresh = async () => {
    await fetchSalesUser(session?.user?.id);
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        authUser: session?.user ?? null,
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
