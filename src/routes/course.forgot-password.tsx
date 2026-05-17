import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import logo from "@/assets/learniby-logo.webp";
import { toast } from "sonner";

export const Route = createFileRoute("/course/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("পাঠানো যায়নি", { description: error.message });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
        <Card className="relative z-10 w-full max-w-md border-2 p-8 text-center shadow-[var(--shadow-elegant)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-lime">
            <CheckCircle2 className="h-11 w-11 text-accent-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">ইমেইল পাঠানো হয়েছে</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            আপনার ইমেইল ({email}) চেক করুন। লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন।
            ইনবক্সে না পেলে স্প্যাম ফোল্ডারও দেখুন।
          </p>
          <Button
            className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold"
            onClick={() => navigate({ to: "/course/login" })}
          >
            লগইন পেজে যান →
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />

      <Card className="relative z-10 w-full max-w-md border-2 p-7 shadow-[var(--shadow-elegant)] sm:p-9">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Learniby" className="h-14 w-auto" />
          <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <KeyRound className="h-7 w-7" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">পুনরুদ্ধার</p>
          <h1 className="mt-1 text-3xl font-extrabold">পাসওয়ার্ড <span className="text-gradient">রিসেট</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">আপনার ইমেইলে রিসেট লিংক পাঠানো হবে</p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-semibold">ইমেইল</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 border-2 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] text-base font-bold shadow-[var(--shadow-glow)]"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "রিসেট লিংক পাঠান →"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm">
          মনে পড়েছে?{" "}
          <Link to="/course/login" className="font-bold text-primary underline-offset-4 hover:underline">
            লগইন করুন
          </Link>
        </p>
      </Card>
    </div>
  );
}
