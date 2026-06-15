import { defineRoute, useNavigate, Link } from "@/lib/router-compat";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import logo from "@/assets/learniby-logo.webp";
import { toast } from "sonner";

export const Route = defineRoute("/dashboard/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Recovery link থেকে আসলে Supabase auto-handle করে token; আমরা session check করি
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setReady("ok");
      }
    });
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady("ok");
      else {
        // 2 সেকেন্ড অপেক্ষা করি hash থেকে session বানানোর জন্য
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            setReady(session ? "ok" : "invalid");
          });
        }, 2000);
      }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
      return;
    }
    if (pw !== pw2) {
      toast.error("দুই পাসওয়ার্ড মিলছে না");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSubmitting(false);
    if (error) {
      toast.error("পরিবর্তন ব্যর্থ", { description: error.message });
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/dashboard/login" }), 2000);
  };

  if (ready === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
        <Card className="relative z-10 w-full max-w-md border-2 p-8 text-center shadow-[var(--shadow-elegant)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-11 w-11" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">লিংক অবৈধ বা মেয়াদ শেষ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            রিসেট লিংকটি আর কাজ করছে না। অনুগ্রহ করে আবার চেষ্টা করুন।
          </p>
          <Link to="/dashboard/forgot-password">
            <Button className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold">
              নতুন লিংক চান
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
        <Card className="relative z-10 w-full max-w-md border-2 p-8 text-center shadow-[var(--shadow-elegant)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-lime">
            <CheckCircle2 className="h-11 w-11 text-accent-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">পাসওয়ার্ড পরিবর্তিত!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            লগইন পেজে নিয়ে যাওয়া হচ্ছে...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl animate-blob" />

      <Card className="relative z-10 w-full max-w-md border-2 p-7 shadow-[var(--shadow-elegant)] sm:p-9">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Learniby" className="h-14 w-auto" />
          <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">নতুন পাসওয়ার্ড</p>
          <h1 className="mt-1 text-3xl font-extrabold">নতুন পাসওয়ার্ড <span className="text-gradient">সেট করুন</span></h1>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="font-semibold">নতুন পাসওয়ার্ড</Label>
            <Input
              id="pw"
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="h-12 border-2 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2" className="font-semibold">আবার লিখুন</Label>
            <Input
              id="pw2"
              type="password"
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="••••••••"
              className="h-12 border-2 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] text-base font-bold shadow-[var(--shadow-glow)]"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "পরিবর্তন করুন →"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
