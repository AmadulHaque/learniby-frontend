import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ChevronLeft, PlayCircle, Layers, Filter } from "lucide-react";
import { fetchUserProgress, type ProgressRow } from "@/lib/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/course/$courseId")({
  component: CoursePage,
});

interface Module {
  id: string;
  title: string;
  description: string | null;
  batch_number: string | null;
  videos: { id: string; title: string; duration_seconds: number | null; youtube_id: string | null }[];
}

function CoursePage() {
  const { courseId } = Route.useParams();
  const { user, loading } = useAuth();
  const [course, setCourse] = useState<{ title: string; description: string | null } | null>(null);
  const [modules, setModules] = useState<Module[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [batchFilter, setBatchFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase
        .from("courses")
        .select("title,description")
        .eq("id", courseId)
        .maybeSingle();
      setCourse(c);

      const { data: m } = await supabase
        .from("modules")
        .select("id,title,description,batch_number,sort_order,videos(id,title,duration_seconds,youtube_id,sort_order)")
        .eq("course_id", courseId)
        .order("sort_order");

      const sorted = (m ?? []).map((mod: any) => ({
        ...mod,
        videos: (mod.videos ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setModules(sorted);

      const p = await fetchUserProgress(user.id);
      setProgress(p.filter((x) => x.course_id === courseId));
    })();
  }, [courseId, user]);

  const doneIds = useMemo(() => new Set(progress.filter((p) => p.completed).map((p) => p.video_id)), [progress]);

  // unique batch numbers present in this course
  const batches = useMemo(() => {
    const set = new Set<string>();
    (modules ?? []).forEach((m) => {
      if (m.batch_number && m.batch_number.trim()) set.add(m.batch_number.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [modules]);

  const visibleModules = useMemo(() => {
    if (!modules) return null;
    if (batchFilter === "all") return modules;
    if (batchFilter === "__none__") return modules.filter((m) => !m.batch_number);
    return modules.filter((m) => (m.batch_number ?? "").trim() === batchFilter);
  }, [modules, batchFilter]);

  const totals = useMemo(() => {
    const list = visibleModules ?? [];
    const total = list.reduce((n, m) => n + m.videos.length, 0);
    const done = list.reduce(
      (n, m) => n + m.videos.filter((v) => doneIds.has(v.id)).length,
      0,
    );
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [visibleModules, doneIds]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">…</div>;
  if (!user) return <Navigate to="/dashboard/login" />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/dashboard" className="mb-5 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> সব কোর্স
        </Link>
        {course === null ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : !course ? (
          <Card className="border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            এই কোর্সে আপনার এক্সেস নেই বা কোর্সটি পাওয়া যায়নি।
          </Card>
        ) : (
          <>
            <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary">কোর্স</p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">{course.title}</h1>
              {course.description && (
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{course.description}</p>
              )}

              {totals.total > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-bold">আপনার অগ্রগতি</span>
                      <span className="font-extrabold text-primary">{totals.pct}%</span>
                    </div>
                    <Progress value={totals.pct} className="h-2.5" />
                  </div>
                  <div className="rounded-2xl border-2 border-primary/30 bg-card px-4 py-3 text-center">
                    <p className="text-2xl font-extrabold text-primary">{totals.done}<span className="text-sm text-muted-foreground">/{totals.total}</span></p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">সম্পন্ন</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-4">
              {batches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-primary/20 bg-card/50 p-3">
                  <div className="flex items-center gap-1.5 pl-1 text-xs font-extrabold uppercase tracking-wider text-primary">
                    <Filter className="h-3.5 w-3.5" /> ব্যাচ:
                  </div>
                  <Button
                    size="sm"
                    variant={batchFilter === "all" ? "default" : "outline"}
                    onClick={() => setBatchFilter("all")}
                    className={`h-8 rounded-full px-3 text-xs font-bold ${batchFilter === "all" ? "bg-gradient-to-r from-primary to-[var(--primary-glow)]" : "border-2"}`}
                  >
                    সব ({modules?.length ?? 0})
                  </Button>
                  {batches.map((b) => {
                    const count = (modules ?? []).filter((m) => (m.batch_number ?? "").trim() === b).length;
                    const active = batchFilter === b;
                    return (
                      <Button
                        key={b}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => setBatchFilter(b)}
                        className={`h-8 rounded-full px-3 text-xs font-bold ${active ? "bg-gradient-to-r from-primary to-[var(--primary-glow)] shadow-[var(--shadow-glow)]" : "border-2"}`}
                      >
                        {b} ({count})
                      </Button>
                    );
                  })}
                  {(modules ?? []).some((m) => !m.batch_number) && (
                    <Button
                      size="sm"
                      variant={batchFilter === "__none__" ? "default" : "outline"}
                      onClick={() => setBatchFilter("__none__")}
                      className={`h-8 rounded-full px-3 text-xs font-bold ${batchFilter === "__none__" ? "bg-gradient-to-r from-primary to-[var(--primary-glow)]" : "border-2"}`}
                    >
                      ব্যাচ ছাড়া
                    </Button>
                  )}
                </div>
              )}
              {visibleModules === null ? (
                [1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : visibleModules.length === 0 ? (
                <Card className="border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                  {modules && modules.length > 0
                    ? "এই ব্যাচে কোনো ক্লাস পাওয়া যায়নি।"
                    : "এই কোর্সে এখনো কোনো ক্লাস যোগ করা হয়নি।"}
                </Card>
              ) : (
                visibleModules.map((mod, mi) => {
                  const modDone = mod.videos.filter((v) => doneIds.has(v.id)).length;
                  const modPct = mod.videos.length ? Math.round((modDone / mod.videos.length) * 100) : 0;
                  return (
                    <Card
                      key={mod.id}
                      className="overflow-hidden border-2 p-0 animate-fade-in transition hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
                      style={{ animationDelay: `${mi * 70}ms` }}
                    >
                      <div className="border-b-2 bg-gradient-to-r from-primary/10 to-accent/10 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                              <Layers className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">ক্লাস {mi + 1}</p>
                                {mod.batch_number && (
                                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground shadow-lime">
                                    ব্যাচ {mod.batch_number}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-lg font-extrabold">{mod.title}</h2>
                            </div>
                          </div>
                          {mod.videos.length > 0 && (
                            <div className="text-right">
                              <p className="text-lg font-extrabold text-primary">{modDone}/{mod.videos.length}</p>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground">{modPct}%</p>
                            </div>
                          )}
                        </div>
                        {mod.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
                        )}
                      </div>
                      {mod.videos.length === 0 ? (
                        <div className="p-5 text-sm text-muted-foreground">কোনো ভিডিও নেই।</div>
                      ) : (
                        <ul className="divide-y-2 divide-border/50">
                          {mod.videos.map((v, idx) => {
                            const done = doneIds.has(v.id);
                            const thumb = v.youtube_id
                              ? `https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`
                              : null;
                            return (
                              <li key={v.id}>
                                <Link
                                  to="/dashboard/course/$courseId/video/$videoId"
                                  params={{ courseId, videoId: v.id }}
                                  className="group flex items-center gap-4 p-3 transition hover:bg-primary/5"
                                >
                                  <div className="relative h-[72px] w-32 shrink-0 overflow-hidden rounded-xl bg-muted ring-2 ring-border/60 transition group-hover:ring-primary/40 sm:h-20 sm:w-36">
                                    {thumb ? (
                                      <img
                                        src={thumb}
                                        alt={v.title}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition group-hover:scale-105"
                                        onError={(e) => {
                                          // mqdefault may 404 for some private/unlisted edge cases — fall back to hqdefault
                                          const img = e.currentTarget;
                                          if (!img.dataset.fallback && v.youtube_id) {
                                            img.dataset.fallback = "1";
                                            img.src = `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-primary/10">
                                        <PlayCircle className="h-7 w-7 text-primary/60" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                                      <div className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition ${
                                        done
                                          ? "bg-accent text-accent-foreground"
                                          : "bg-white/95 text-primary opacity-0 group-hover:opacity-100"
                                      }`}>
                                        {done ? <CheckCircle2 className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                                      </div>
                                    </div>
                                    {v.duration_seconds ? (
                                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, "0")}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-bold leading-snug ${done ? "text-muted-foreground" : ""}`}>
                                      <span className="text-muted-foreground">{idx + 1}.</span> {v.title}
                                    </p>
                                    {done && (
                                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-accent-foreground">
                                        <CheckCircle2 className="h-3 w-3" /> সম্পন্ন
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
