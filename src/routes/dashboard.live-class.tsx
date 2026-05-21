import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StudentShell } from "@/components/course/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Calendar, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard/live-class")({
  component: LiveClassPage,
  head: () => ({ meta: [{ title: "লাইভ ক্লাস — Learniby" }] }),
});

const PRIMARY = "#7B1CB8";

function LiveClassPage() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("class_sessions" as any)
        .select("*, batches(name)")
        .order("scheduled_at", { ascending: true });
      setSessions((data as any) || []);
      setLoad(false);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

  const now = Date.now();
  const upcoming = sessions.filter((s) => new Date(s.scheduled_at).getTime() >= now - 30 * 60 * 1000);
  const past = sessions.filter((s) => new Date(s.scheduled_at).getTime() < now - 30 * 60 * 1000);

  return (
    <StudentShell>
      <div className="space-y-6">
        <Section title="আসন্ন লাইভ ক্লাস" items={upcoming} loading={load} empty="এখন কোনো আসন্ন ক্লাস নেই" canJoin />
        <Section title="পূর্ববর্তী ক্লাস" items={past.slice(0, 10)} loading={load} empty="কোনো পূর্ববর্তী ক্লাস নেই" />
      </div>
    </StudentShell>
  );
}

function Section({
  title, items, loading, empty, canJoin = false,
}: { title: string; items: any[]; loading: boolean; empty: string; canJoin?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">লোড হচ্ছে...</p>
      ) : items.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-slate-500">
          <Radio className="h-4 w-4" />
          <p className="text-[15px]">{empty}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{s.title}</h3>
                  {s.batches?.name && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "#F7F1FB", color: PRIMARY }}>
                      {s.batches.name}
                    </span>
                  )}
                </div>
                {s.description && <p className="mt-1 text-sm text-slate-600">{s.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
                    {new Date(s.scheduled_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_min} মিনিট</span>
                </div>
              </div>
              {canJoin && (
                <a href={s.meeting_link} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                   style={{ background: PRIMARY }}>
                  Join <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
