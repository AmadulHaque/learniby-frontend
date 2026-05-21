import { createFileRoute, useNavigate, Navigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, ShieldCheck, Zap } from "lucide-react";
import logo from "@/assets/learniby-logo.webp";
import { AuthTabs } from "@/components/course/AuthTabs";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (user) return <Navigate to={(role === "admin" ? "/dashboard/admin" : role === "manager" ? "/dashboard/manager" : role === "teacher" ? "/dashboard/teacher" : "/dashboard") as any} />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("লগইন ব্যর্থ", { description: error });
    } else {
      toast.success("স্বাগতম!");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Mesh gradient blobs */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-64 w-64 rounded-full bg-[var(--primary-glow)]/30 blur-3xl animate-blob" style={{ animationDelay: "9s" }} />

      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        {/* Left brand panel - desktop only */}
        <div className="hidden flex-col justify-between rounded-3xl bg-gradient-to-br from-[var(--primary-deep)] via-primary to-[var(--primary-glow)] p-10 text-primary-foreground shadow-[var(--shadow-elegant)] lg:flex">
          <div>
            <img src={logo} alt="Learniby" className="h-12 w-auto brightness-0 invert" />
            <h2 className="mt-10 text-4xl font-extrabold leading-tight">
              শিখুন <span className="text-accent">যেখানে</span>,<br />
              যেকোনো সময়।
            </h2>
            <p className="mt-4 text-lg opacity-90">
              আপনার ব্যক্তিগত কোর্স পোর্টালে লগইন করে চালিয়ে যান যেখান থেকে শেষ করেছিলেন।
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: Zap, t: "দ্রুত অ্যাক্সেস", d: "এক ক্লিকেই কোর্সে ঢুকুন" },
              { icon: ShieldCheck, t: "নিরাপদ", d: "অনুমোদিত শিক্ষার্থীদের জন্য" },
              { icon: Sparkles, t: "প্রিমিয়াম কনটেন্ট", d: "বিশেষজ্ঞের তৈরি ভিডিও" },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{t}</p>
                  <p className="text-xs opacity-80">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <Card className="relative z-10 border-2 p-7 shadow-[var(--shadow-elegant)] sm:p-9">
          <div className="flex flex-col items-center text-center lg:hidden">
            <img src={logo} alt="Learniby" className="h-14 w-auto" />
          </div>
          <div className="mt-2 lg:mt-0">
            <AuthTabs active="login" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">স্বাগতম</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">লগইন <span className="text-gradient">করুন</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">আপনার একাউন্টে প্রবেশ করে শেখা শুরু করুন</p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 border-2 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-semibold">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 border-2 text-base"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] text-base font-bold shadow-[var(--shadow-glow)] transition hover:scale-[1.01] hover:shadow-[var(--shadow-elegant)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "লগইন করুন →"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link to="/dashboard/forgot-password" className="font-semibold text-muted-foreground hover:text-primary hover:underline underline-offset-4">
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </p>

          <p className="mt-5 text-center text-sm">
            নতুন একাউন্ট?{" "}
            <Link to="/dashboard/register" className="font-bold text-primary underline-offset-4 hover:underline">
              রেজিস্ট্রেশন করুন
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
