import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { upsertProgress } from "@/lib/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/course/course/$courseId/video/$videoId")({
  component: VideoPage,
});

interface Video {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  module_id: string;
  duration_seconds: number | null;
}

function VideoPage() {
  const { courseId, videoId } = Route.useParams();
  const { user, loading } = useAuth();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);
  const [siblings, setSiblings] = useState<{ id: string; title: string }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const watchedRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    setCompleted(false);
    watchedRef.current = 0;
    (async () => {
      const { data: v } = await supabase
        .from("videos")
        .select("id,title,description,youtube_id,module_id,duration_seconds")
        .eq("id", videoId)
        .maybeSingle();
      setVideo(v);

      if (v) {
        const { data: list } = await supabase
          .from("videos")
          .select("id,title,sort_order")
          .eq("module_id", v.module_id)
          .order("sort_order");
        setSiblings(list ?? []);

        const { data: p } = await supabase
          .from("video_progress")
          .select("video_id,completed,watched_seconds")
          .eq("user_id", user.id)
          .eq("course_id", courseId);
        const done = new Set<string>();
        (p ?? []).forEach((r) => {
          if (r.completed) done.add(r.video_id);
          if (r.video_id === videoId) {
            setCompleted(r.completed);
            watchedRef.current = r.watched_seconds;
          }
        });
        setDoneIds(done);
      }
    })();
  }, [videoId, user, courseId]);

  // Heartbeat: every 15s mark watched_seconds += 15; auto-complete at 90% of duration
  useEffect(() => {
    if (!user || !video) return;
    const interval = setInterval(async () => {
      watchedRef.current += 15;
      const dur = video.duration_seconds ?? 0;
      const shouldComplete =
        completed ||
        (dur > 0 ? watchedRef.current >= dur * 0.9 : watchedRef.current >= 5 * 60);
      await upsertProgress({
        userId: user.id,
        videoId: video.id,
        courseId,
        watchedSeconds: watchedRef.current,
        completed: shouldComplete,
      });
      if (shouldComplete && !completed) {
        setCompleted(true);
        setDoneIds((s) => new Set(s).add(video.id));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user, video, courseId, completed]);

  const markComplete = async () => {
    if (!user || !video) return;
    await upsertProgress({
      userId: user.id,
      videoId: video.id,
      courseId,
      watchedSeconds: Math.max(watchedRef.current, video.duration_seconds ?? 60),
      completed: true,
    });
    setCompleted(true);
    setDoneIds((s) => new Set(s).add(video.id));
    toast.success("সম্পন্ন হিসেবে চিহ্নিত");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">…</div>;
  if (!user) return <Navigate to="/course/login" />;

  const idx = siblings.findIndex((s) => s.id === videoId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <Link
          to="/course/course/$courseId"
          params={{ courseId }}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> কোর্সে ফিরে যান
        </Link>

        {video === undefined ? (
          <Skeleton className="aspect-video w-full rounded-2xl" />
        ) : !video ? (
          <Card className="border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            ভিডিও পাওয়া যায়নি বা এক্সেস নেই।
          </Card>
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-2xl bg-black ring-2 ring-primary/30 shadow-[var(--shadow-elegant)]"
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1&fs=1&iv_load_policy=3&disablekb=1`}
                  title={video.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {/* Email watermark overlay — non-blocking pointer events */}
                <div className="pointer-events-none absolute inset-0 select-none">
                  <span className="absolute right-3 top-3 rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                    {user.email}
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                    Learniby · {user.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold sm:text-3xl">{video.title}</h1>
                {video.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{video.description}</p>
                )}
              </div>
              <Button
                onClick={markComplete}
                disabled={completed}
                size="lg"
                className={`gap-1.5 rounded-full font-bold ${
                  completed
                    ? "bg-accent text-accent-foreground shadow-lime"
                    : "bg-gradient-to-r from-primary to-[var(--primary-glow)] shadow-[var(--shadow-glow)]"
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
                {completed ? "সম্পন্ন ✓" : "সম্পন্ন চিহ্নিত করুন"}
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link to="/course/course/$courseId/video/$videoId" params={{ courseId, videoId: prev.id }}>
                  <Card className="flex items-center gap-3 border-2 p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ChevronLeft className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">পূর্ববর্তী</p>
                      <p className="truncate text-sm font-bold">{prev.title}</p>
                    </div>
                  </Card>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link to="/course/course/$courseId/video/$videoId" params={{ courseId, videoId: next.id }}>
                  <Card className="flex items-center justify-end gap-3 border-2 p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
                    <div className="min-w-0 text-right">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">পরবর্তী</p>
                      <p className="truncate text-sm font-bold">{next.title}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </Card>
                </Link>
              ) : (
                <div />
              )}
            </div>

            {siblings.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-primary">এই ক্লাসের ভিডিও</h2>
                <Card className="divide-y-2 divide-border/50 border-2 p-0">
                  {siblings.map((s, i) => {
                    const isDone = doneIds.has(s.id);
                    const isCurrent = s.id === videoId;
                    return (
                      <Link
                        key={s.id}
                        to="/course/course/$courseId/video/$videoId"
                        params={{ courseId, videoId: s.id }}
                        className={`flex items-center gap-3 p-3.5 text-sm transition hover:bg-primary/5 ${
                          isCurrent ? "bg-primary/10 font-extrabold text-primary" : ""
                        }`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
                          {i + 1}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-foreground" />
                        ) : (
                          <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={`truncate ${isDone && !isCurrent ? "text-muted-foreground" : ""}`}>
                          {s.title}
                        </span>
                      </Link>
                    );
                  })}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
