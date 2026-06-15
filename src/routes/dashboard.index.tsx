import { defineRoute, Navigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/course/StudentShell";
import { Card } from "@/components/ui/card";
import { Calendar, BookOpenText, Clock, ShieldAlert, MessageCircle } from "lucide-react";

export const Route = defineRoute("/dashboard/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — Learniby" },
      { name: "description", content: "Learniby শিক্ষার্থী ড্যাশবোর্ড — লাইভ ক্লাস, কোর্স, সার্টিফিকেট সব এক জায়গায়।" },
    ],
  }),
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const [profileStatus, setProfileStatus] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setProfileStatus(null);
      return;
    }
    supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileStatus(data?.status ?? null));
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/dashboard/login" />;

  if (profileStatus === "ip_locked") {
    return <LockedScreen />;
  }

  return (
    <StudentShell>
      <DashboardContent pending={profileStatus === "pending"} rejected={profileStatus === "rejected"} />
    </StudentShell>
  );
}

function DashboardContent({ pending, rejected }: { pending: boolean; rejected: boolean }) {
  const greeting = useGreeting();
  const todayBn = useTodayBn();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main column — 3 sections */}
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        {pending && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            আপনার রেজিস্ট্রেশন অ্যাডমিনের রিভিউতে আছে। অনুমোদনের পর কোর্স দেখা যাবে।
          </div>
        )}
        {rejected && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            আপনার রেজিস্ট্রেশন অনুমোদন করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।
          </div>
        )}

        <Section title="আজকের লাইভ ক্লাস" empty="আজ তোমার কোনো ক্লাস নেই" />
        <div className="my-6 h-px bg-slate-100" />
        <Section title="আজকের লাইভ পরীক্ষা" empty="আজ তোমার কোনো পরীক্ষা নেই" />
        <div className="my-6 h-px bg-slate-100" />
        <Section title="আগামী ক্লাস সমূহ" empty="আগামী কিছু দিন কোনো ক্লাস নেই" />
      </div>

      {/* Right side greeting card */}
      <aside>
        <Card
          className="relative overflow-hidden rounded-2xl border-0 p-6 text-white shadow-sm"
          style={{
            background: "linear-gradient(135deg, #7B1CB8 0%, #A855F7 60%, #EC4899 100%)",
          }}
        >
          <h3 className="text-2xl font-extrabold">
            {greeting}! <span aria-hidden>👋</span>
          </h3>

          <div className="mt-4 flex items-start gap-3">
            <BookOpenText className="mt-0.5 h-6 w-6 text-white" />
            <p className="text-[15px] font-semibold leading-snug">
              লাইভ ক্লাসের খুঁটিনাটি সব জেনে নাও ড্যাশবোর্ডে
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-white/80">আজকের তারিখ</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/25 px-3 py-2 text-sm font-bold text-white backdrop-blur">
              <Calendar className="h-4 w-4" />
              {todayBn}
            </div>
          </div>

          {/* decorative book glyph */}
          <BookOpenText
            className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 text-white/40"
            strokeWidth={1.25}
          />
        </Card>
      </aside>
    </div>
  );
}

function Section({ title, empty }: { title: string; empty: string }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2>
      <div className="mt-3 flex items-center gap-2 text-slate-500">
        <Clock className="h-4 w-4" />
        <p className="text-[15px]">{empty}</p>
      </div>
    </section>
  );
}

function useGreeting() {
  const h = new Date().getHours();
  if (h < 4) return "শুভ রাত্রি";
  if (h < 12) return "শুভ সকাল";
  if (h < 16) return "শুভ অপরাহ্ণ";
  if (h < 19) return "শুভ বিকাল";
  return "শুভ সন্ধ্যা";
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
function toBnDigits(n: number) {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}
function useTodayBn() {
  const d = new Date();
  return `${toBnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBnDigits(d.getFullYear())}`;
}

function LockedScreen() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-2 border-destructive/30 p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">একাউন্ট সাময়িকভাবে লক</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            নিরাপত্তার জন্য আপনার একাউন্ট নতুন IP থেকে লগইনের কারণে লক করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
          <a
            href="https://wa.me/8801631242303"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" /> যোগাযোগ
          </a>
        </Card>
      </div>
    </div>
  );
}
