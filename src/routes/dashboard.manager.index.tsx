import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Building2, Radio, BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/manager/")({
  component: ManagerHome,
});

function ManagerHome() {
  const [stats, setStats] = useState({ students: 0, batches: 0, sessions: 0, courses: 0 });

  useEffect(() => {
    (async () => {
      const [s, b, c, co] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("batches").select("id", { count: "exact", head: true }),
        supabase.from("class_sessions" as any).select("id", { count: "exact", head: true }).gte("scheduled_at", new Date().toISOString()),
        supabase.from("courses").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        students: s.count || 0,
        batches: b.count || 0,
        sessions: c.count || 0,
        courses: co.count || 0,
      });
    })();
  }, []);

  const tiles = [
    { label: "ছাত্র/ছাত্রী", value: stats.students, icon: Users, to: "/dashboard/manager/students" },
    { label: "ব্যাচ", value: stats.batches, icon: Building2, to: "/dashboard/manager/batches" },
    { label: "কোর্স", value: stats.courses, icon: BookOpen, to: "/dashboard/manager/courses" },
    { label: "আসন্ন লাইভ ক্লাস", value: stats.sessions, icon: Radio, to: "/dashboard/manager/sessions" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">ম্যানেজার ড্যাশবোর্ড</h1>
        <p className="text-sm text-slate-500">স্টুডেন্ট, ব্যাচ, কোর্স ও লাইভ ক্লাস ম্যানেজ করুন।</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to as any}>
              <Card className="p-5 transition hover:shadow-md">
                <Icon className="h-6 w-6" style={{ color: "#7B1CB8" }} />
                <div className="mt-3 text-3xl font-extrabold text-slate-900">{t.value}</div>
                <div className="mt-1 text-sm text-slate-500">{t.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
