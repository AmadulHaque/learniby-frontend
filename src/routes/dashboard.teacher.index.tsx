import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Radio, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  Batches,
  ClassSessions,
  type BatchRow,
  type ClassSessionRow,
} from "@/lib/teacher-api";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/")({
  component: TeacherHome,
});

function TeacherHome() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [upcoming, setUpcoming] = useState<ClassSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const [bs, ss] = await Promise.all([
          Batches.list({ scope: "mine" }),
          ClassSessions.list({
            scope: "mine",
            from: nowIso,
            direction: "asc",
            limit: 10,
          }),
        ]);
        setBatches(bs.data ?? []);
        setUpcoming(ss.data ?? []);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "লোড করতে সমস্যা");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">শিক্ষক ড্যাশবোর্ড</h1>
        <p className="text-sm text-slate-500">ক্লাস শুরুর আগে আপনার ব্যাচে লাইভ লিংক যোগ করুন।</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7B1CB8" }} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">আপনার ব্যাচ ({batches.length})</h2>
            <div className="mt-3 space-y-2">
              {batches.length === 0 ? (
                <p className="text-sm text-slate-500">কোনো ব্যাচ assign করা নেই।</p>
              ) : (
                batches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold">{b.name}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">আসন্ন লাইভ ক্লাস</h2>
              <Link to={"/dashboard/teacher/sessions" as any} className="text-xs font-semibold" style={{ color: "#7B1CB8" }}>
                সব দেখুন →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Radio className="h-4 w-4" /> কোনো আসন্ন ক্লাস নেই
              </div>
            ) : (
              upcoming.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-t border-slate-100 py-2 first:border-0">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.scheduled_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <a href={s.meeting_link} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: "#7B1CB8" }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
