import { defineRoute, Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminStats } from "@/rpc/admin";
import { adminAuditList } from "@/rpc/bulk";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, GraduationCap, PlayCircle, UserPlus, Users, ArrowRight, ScrollText,
} from "lucide-react";

export const Route = defineRoute("/dashboard/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { session } = useAuth();
  const [stats, setStats] = useState<{
    pending: number; approved: number; courses: number; videos: number;
  } | null>(null);
  const [audit, setAudit] = useState<any[] | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    adminStats({ data: { accessToken: session.access_token } })
      .then(setStats)
      .catch(() => setStats({ pending: 0, approved: 0, courses: 0, videos: 0 }));
    adminAuditList({ data: { accessToken: session.access_token, limit: 15 } })
      .then((r) => setAudit(r.entries))
      .catch(() => setAudit([]));
  }, [session?.access_token]);

  const cards = [
    {
      label: "অপেক্ষমাণ অনুমোদন",
      value: stats?.pending ?? 0,
      icon: UserPlus,
      href: "/dashboard/admin/pending",
      gradient: "from-warning to-warning/60",
      ring: "ring-warning/40",
      iconBg: "bg-warning text-warning-foreground",
      highlight: (stats?.pending ?? 0) > 0,
    },
    {
      label: "অনুমোদিত ছাত্র",
      value: stats?.approved ?? 0,
      icon: Users,
      href: "/dashboard/admin/students",
      gradient: "from-primary to-[var(--primary-glow)]",
      iconBg: "bg-primary text-primary-foreground",
    },
    {
      label: "কোর্স",
      value: stats?.courses ?? 0,
      icon: BookOpen,
      href: "/dashboard/admin/courses",
      gradient: "from-accent to-accent/50",
      iconBg: "bg-accent text-accent-foreground",
    },
    {
      label: "মোট ভিডিও",
      value: stats?.videos ?? 0,
      icon: PlayCircle,
      href: "/dashboard/admin/courses",
      gradient: "from-[var(--primary-glow)] to-accent",
      iconBg: "bg-[var(--primary-deep)] text-primary-foreground",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">কন্ট্রোল প্যানেল</p>
        <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">ড্যাশ<span className="text-gradient">বোর্ড</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">পোর্টালের সারসংক্ষেপ ও দ্রুত অ্যাকশন</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.href as any}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Card
                className={`group relative h-full overflow-hidden border-2 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)] ${
                  c.highlight ? `ring-2 ${c.ring}` : ""
                }`}
              >
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg} shadow`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="relative mt-4 text-4xl font-extrabold tracking-tight">{c.value}</p>
                <p className="relative text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {(stats?.pending ?? 0) > 0 && (
        <Card className="flex flex-col items-start gap-4 overflow-hidden border-2 border-warning/40 bg-gradient-to-r from-warning/15 via-warning/5 to-transparent p-6 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning text-warning-foreground shadow-lg">
            <UserPlus className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-extrabold">{stats?.pending} জন রেজিস্ট্রেশন অপেক্ষায়</p>
            <p className="text-sm text-muted-foreground">নতুন ছাত্ররা আপনার অনুমোদনের জন্য অপেক্ষা করছে।</p>
          </div>
          <Link to="/dashboard/admin/pending">
            <Button size="lg" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]">
              এখনই দেখুন <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      <Card className="border-2 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">দ্রুত নির্দেশিকা</h2>
            <p className="text-xs text-muted-foreground">কীভাবে ছাত্র যোগ ও ভিডিও অ্যাক্সেস দিবেন</p>
          </div>
        </div>
        <ol className="mt-5 space-y-3 text-sm">
          {[
            { n: "১", t: "ছাত্ররা /register পেজে নিজেরা রেজিস্ট্রেশন করবে" },
            { n: "২", t: "\"অনুমোদন\" ট্যাব থেকে রিভিউ করে অনুমোদন দিন" },
            { n: "৩", t: "\"ছাত্র\" ট্যাব থেকে যেকোনো প্রোফাইলে গিয়ে ভিডিও অ্যাক্সেস দিন" },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-3 rounded-xl border-2 border-border/60 bg-muted/30 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] font-extrabold text-primary-foreground shadow">{s.n}</span>
              <span className="pt-1 font-medium">{s.t}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="border-2 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold">সাম্প্রতিক অ্যাডমিন কার্যক্রম</h2>
            <p className="text-xs text-muted-foreground">শেষ {audit?.length ?? 0}টি ঘটনা</p>
          </div>
        </div>
        {audit === null ? (
          <p className="text-sm text-muted-foreground">লোড হচ্ছে…</p>
        ) : audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">কোনো লগ এন্ট্রি নেই।</p>
        ) : (
          <ul className="divide-y-2 divide-border/40">
            {audit.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-2 py-2.5 text-sm">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {e.action}
                </span>
                <span className="font-bold">{e.actor_name}</span>
                <span className="text-muted-foreground">→ {e.target_type}</span>
                {e.meta && (
                  <span className="text-xs text-muted-foreground">
                    {Object.entries(e.meta).map(([k, v]) => `${k}:${v}`).join(", ")}
                  </span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("bn-BD")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
