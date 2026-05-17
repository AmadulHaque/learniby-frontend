import { createFileRoute, Navigate, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { publicRegister } from "@/server/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, GraduationCap, Briefcase } from "lucide-react";
import logo from "@/assets/learniby-logo.webp";
import { toast } from "sonner";

export const Route = createFileRoute("/course/register")({
  component: RegisterPage,
});

type Mode = "student" | "teacher";

function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("student");
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", address: "", institution: "", student_id: "", batch_number: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (loading)
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (user && !done) return <Navigate to="/course" />;

  const update = (k: keyof typeof form) => (e: any) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Minimal validation — only essentials. Keep it smooth.
    const email = form.email.trim();
    const password = form.password;
    const fullName = form.full_name.trim();
    if (!fullName) {
      toast.error("নাম দিন");
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("সঠিক ইমেইল দিন");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
      return;
    }

    setSubmitting(true);
    try {
      await publicRegister({
        data: {
          email,
          password,
          full_name: fullName,
          phone: form.phone.trim(),
          requested_role: mode,
          address: mode === "student" ? form.address.trim() : undefined,
          institution: form.institution.trim(),
          student_id: mode === "student" ? form.student_id.trim() : undefined,
          batch_number: mode === "student" ? form.batch_number.trim() : undefined,
        },
      });
      setDone(true);
    } catch (err: any) {
      toast.error("রেজিস্ট্রেশন ব্যর্থ", { description: err?.message ?? "আবার চেষ্টা করুন" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
        <Card className="relative z-10 w-full max-w-md border-2 p-8 text-center shadow-[var(--shadow-elegant)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-lime">
            <CheckCircle2 className="h-11 w-11 text-accent-foreground" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold">অভিনন্দন! 🎉</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "teacher"
              ? "শিক্ষক রেজিস্ট্রেশন সম্পন্ন হয়েছে। মাস্টার অ্যাডমিন রিভিউ করে অনুমোদন দিলে আপনি অ্যাডমিন প্যানেলে অ্যাক্সেস পাবেন।"
              : "রেজিস্ট্রেশন সম্পন্ন হয়েছে। অ্যাডমিন রিভিউ করে অনুমোদন দিলে আপনি লগইন করতে পারবেন।"}
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
    <div className="relative min-h-screen overflow-hidden bg-background p-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl animate-blob" style={{ animationDelay: "6s" }} />

      <Card className="relative z-10 mx-auto w-full max-w-lg border-2 p-7 shadow-[var(--shadow-elegant)] sm:p-9">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Learniby" className="h-14 w-auto" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">নতুন একাউন্ট</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">শুরু <span className="text-gradient">করুন</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "teacher"
              ? "শিক্ষক হিসেবে রেজিস্ট্রেশন — মাস্টার অ্যাডমিন অনুমোদনের পর অ্যাডমিন প্যানেল ব্যবহার করতে পারবেন"
              : "তথ্য পূরণ করুন — অ্যাডমিন অনুমোদনের পর অ্যাক্সেস পাবেন"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border-2 border-border/60 bg-muted/40 p-1.5">
          <button
            type="button"
            onClick={() => setMode("student")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              mode === "student"
                ? "bg-gradient-to-r from-primary to-[var(--primary-glow)] text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4" /> ছাত্র
          </button>
          <button
            type="button"
            onClick={() => setMode("teacher")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              mode === "teacher"
                ? "bg-gradient-to-r from-primary to-[var(--primary-glow)] text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" /> শিক্ষক (অ্যাডমিন)
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="font-semibold">পূর্ণ নাম *</Label>
            <Input id="full_name" required value={form.full_name} onChange={update("full_name")} placeholder="মোঃ রহিম উদ্দিন" className="h-11 border-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold">ইমেইল *</Label>
              <Input id="email" type="email" required value={form.email} onChange={update("email")} placeholder="you@example.com" className="h-11 border-2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-semibold">ফোন</Label>
              <Input id="phone" value={form.phone} onChange={update("phone")} placeholder="01XXXXXXXXX" className="h-11 border-2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="institution" className="font-semibold">প্রতিষ্ঠান</Label>
            <Input id="institution" value={form.institution} onChange={update("institution")} placeholder="ঢাকা কলেজ" className="h-11 border-2" />
          </div>

          {mode === "student" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="student_id" className="font-semibold">স্টুডেন্ট আইডি</Label>
                  <Input id="student_id" value={form.student_id} onChange={update("student_id")} placeholder="যেমন: LRN-2025-001" className="h-11 border-2" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch_number" className="font-semibold">ব্যাচ নাম্বার</Label>
                  <Input id="batch_number" value={form.batch_number} onChange={update("batch_number")} placeholder="যেমন: Batch-12" className="h-11 border-2" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address" className="font-semibold">ঠিকানা</Label>
                <Textarea id="address" value={form.address} onChange={update("address")} placeholder="বাসা, রোড, এলাকা, জেলা" rows={2} className="border-2" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-semibold">পাসওয়ার্ড * <span className="text-xs font-normal text-muted-foreground">(কমপক্ষে ৬ অক্ষর)</span></Label>
            <Input id="password" type="password" required value={form.password} onChange={update("password")} placeholder="••••••••" className="h-11 border-2" />
          </div>

          {mode === "teacher" && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              💡 শিক্ষক রেজিস্ট্রেশন মাস্টার অ্যাডমিনের অনুমোদন প্রয়োজন। অনুমোদনের পর আপনি কোর্স/ভিডিও ম্যানেজ ও স্টুডেন্ট অ্যাক্সেস দিতে পারবেন।
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] text-base font-bold shadow-[var(--shadow-glow)] transition hover:scale-[1.01]"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "রেজিস্ট্রেশন করুন →"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm">
          ইতিমধ্যে একাউন্ট আছে?{" "}
          <Link to="/course/login" className="font-bold text-primary underline-offset-4 hover:underline">লগইন করুন</Link>
        </p>
      </Card>
    </div>
  );
}
