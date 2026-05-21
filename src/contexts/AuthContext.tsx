import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "manager" | "teacher" | "student" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  isMaster: boolean;
  isAdminLike: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string) => {
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("is_master").eq("id", uid).maybeSingle(),
    ]);
    setIsMaster(!!(profile as any)?.is_master);
    if (!roleRows || roleRows.length === 0) {
      setRole(null);
      return;
    }
    const roles = roleRows.map((r) => r.role);
    if (roles.includes("admin")) setRole("admin");
    else if (roles.includes("manager")) setRole("manager");
    else if (roles.includes("teacher")) setRole("teacher");
    else setRole("student");
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer DB call to avoid deadlock
        setTimeout(() => loadRole(s.user.id), 0);
      } else {
        setRole(null);
        setIsMaster(false);
      }
    });

    // Then existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // IP lock check — ভিন্ন IP হলে account lock + signOut
    try {
      const token = data.session?.access_token;
      if (token) {
        const { verifyLoginIp } = await import("@/server/ipLock");
        const res = await verifyLoginIp({ data: { accessToken: token } });
        if (!res.ok && res.status === "ip_locked") {
          await supabase.auth.signOut();
          setRole(null);
          return {
            error:
              "নিরাপত্তার জন্য আপনার একাউন্ট নতুন IP থেকে লগইনের কারণে লক করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।",
          };
        }
      }
    } catch (e: any) {
      console.error("IP verify failed", e);
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setIsMaster(false);
  };

  const refreshRole = async () => {
    if (user) await loadRole(user.id);
  };

  const isAdminLike = role === "admin" || role === "manager" || role === "teacher";

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
