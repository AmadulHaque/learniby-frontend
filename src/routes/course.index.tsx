import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserProgress, type ProgressRow } from "@/lib/progress";
import { CheckCircle2, Clock, GraduationCap, PlayCircle, Sparkles, ShieldAlert, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/course/")({
  component: HomePage,
});

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}
interface VideoLite {
  id: string;
  title: string;
  module_id: string;
  course_id: string;
}

function HomePage() {
  const { user, loading } = useAuth();
  const [profileStatus, setProfileStatus] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setProfileStatus(null);
      return;
    }
    supabase.from("profiles").select("status").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfileStatus(data?.status ?? null));
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/course/login" />;

  if (profileStatus === "pending") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-4 py-16">
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Clock className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">অনুমোদনের অপেক্ষায়</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              আপনার রেজিস্ট্রেশন অ্যাডমিনের রিভিউ চলছে। অনুমোদনের পর কোর্সগুলো এখানে দেখা যাবে।
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (profileStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-4 py-16">
          <Card className="p-8 text-center">
            <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              আপনার রেজিস্ট্রেশন অনুমোদন করা হয়নি। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (profileStatus === "ip_locked") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card className="p-8 text-center border-2 border-destructive/30 bg-gradient-to-br from-destructive/10 via-background to-warning/10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">একাউন্ট সাময়িকভাবে লক</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              নিরাপত্তার জন্য আপনার একাউন্ট শুধু একটি ডিভাইস/নেটওয়ার্ক থেকে ব্যবহার করা যায়।
              নতুন IP থেকে লগইনের চেষ্টা ধরা পড়েছে, তাই কোর্স লিক প্রতিরোধে একাউন্ট লক করা হয়েছে।
            </p>
            <div className="mt-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary">পরবর্তী ধাপ</p>
              <p className="mt-1.5 text-sm">
                পুনরায় একাউন্ট চালু করতে অ্যাডমিনের সাথে যোগাযোগ করুন। অনুমোদনের পর এই IP থেকে আবার লগইন করতে পারবেন।
              </p>
            </div>
            <a
              href="https://wa.me/8801000000000"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] px-6 py-3 font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <MessageCircle className="h-4 w-4" /> অ্যাডমিনের সাথে যোগাযোগ
            </a>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <Hero />
      <ContinueLearning />
      <CoursesSection />
    </div>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden bg-hero text-primary-foreground">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-[var(--primary-glow)]/40 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px), radial-gradient(circle at 70% 70%, white 1.5px, transparent 1.5px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> আসসালামু আলাইকুম
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          {user?.user_metadata?.full_name || "শিক্ষার্থী"},<br />
          <span className="text-accent">শেখা চালিয়ে</span> যান।
        </h1>
        <p className="mt-4 max-w-xl text-base opacity-90 sm:text-lg">
          আপনার অ্যাসাইন করা সব কোর্স এক জায়গায় — যেখানে শেষ করেছিলেন সেখান থেকে শুরু করুন।
        </p>
      </div>
    </section>
  );
}

function ContinueLearning() {
  const { user } = useAuth();
  const [last, setLast] = useState<{
    video: VideoLite;
    course: { title: string };
    watched: number;
  } | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prog } = await supabase
        .from("video_progress")
        .select("video_id,course_id,watched_seconds,completed,last_watched_at")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("last_watched_at", { ascending: false })
        .limit(1);
      const row = prog?.[0];
      if (!row) {
        setLast(null);
        return;
      }
      const [{ data: v }, { data: c }] = await Promise.all([
        supabase.from("videos").select("id,title,module_id").eq("id", row.video_id).maybeSingle(),
        supabase.from("courses").select("title").eq("id", row.course_id).maybeSingle(),
      ]);
      if (v && c) {
        setLast({
          video: { ...v, course_id: row.course_id },
          course: c,
          watched: row.watched_seconds,
        });
      } else setLast(null);
    })();
  }, [user]);

  if (last === undefined || last === null) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <Card className="flex flex-col items-start gap-4 overflow-hidden border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-background to-accent/15 p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">যেখানে ছিলেন</p>
          <p className="mt-0.5 truncate text-lg font-bold">{last.video.title}</p>
          <p className="truncate text-sm text-muted-foreground">{last.course.title}</p>
        </div>
        <Link
          to="/course/course/$courseId/video/$videoId"
          params={{ courseId: last.video.course_id, videoId: last.video.id }}
        >
          <Button size="lg" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]">
            চালিয়ে যান <PlayCircle className="h-5 w-5" />
          </Button>
        </Link>
      </Card>
    </section>
  );
}

function CoursesSection() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cs } = await supabase
        .from("courses")
        .select("id,title,description,thumbnail_url")
        .order("sort_order");
      setCourses(cs ?? []);

      const ids = (cs ?? []).map((c) => c.id);
      if (ids.length) {
        // Count videos per course (via modules)
        const { data: mods } = await supabase
          .from("modules")
          .select("id,course_id")
          .in("course_id", ids);
        const modIds = (mods ?? []).map((m) => m.id);
        const courseByMod: Record<string, string> = {};
        (mods ?? []).forEach((m) => (courseByMod[m.id] = m.course_id));

        if (modIds.length) {
          const { data: vids } = await supabase
            .from("videos")
            .select("id,module_id")
            .in("module_id", modIds);
          const counts: Record<string, number> = {};
          (vids ?? []).forEach((v) => {
            const cid = courseByMod[v.module_id];
            if (cid) counts[cid] = (counts[cid] ?? 0) + 1;
          });
          setVideoCounts(counts);
        }
      }

      const p = await fetchUserProgress(user.id);
      setProgress(p);
    })();
  }, [user]);

  const completedByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    progress.forEach((p) => {
      if (p.completed) map[p.course_id] = (map[p.course_id] ?? 0) + 1;
    });
    return map;
  }, [progress]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex items-end gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">কোর্স লাইব্রেরি</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">আপনার <span className="text-gradient">কোর্সসমূহ</span></h2>
        </div>
        {courses && (
          <span className="ml-auto rounded-full border-2 border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            {courses.length}টি কোর্স
          </span>
        )}
      </div>

      {courses === null ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">এখনো কোনো কোর্স অ্যাসাইন হয়নি</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            অ্যাডমিন আপনাকে কোর্সে যুক্ত করলে এখানে দেখা যাবে।
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => {
            const total = videoCounts[c.id] ?? 0;
            const done = completedByCourse[c.id] ?? 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link
                key={c.id}
                to="/course/course/$courseId"
                params={{ courseId: c.id }}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-in"
              >
                <Card className="group h-full overflow-hidden border-2 p-0 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]">
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 via-[var(--primary-glow)]/15 to-accent/20">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <PlayCircle className="h-16 w-16 text-primary/50" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                    {pct === 100 && (
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground shadow-lime">
                        <CheckCircle2 className="h-3.5 w-3.5" /> সম্পন্ন
                      </div>
                    )}
                    {pct > 0 && pct < 100 && (
                      <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow">
                        {pct}%
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-1 text-lg font-extrabold">{c.title}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    )}
                    {total > 0 && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">{done}/{total} ভিডিও</span>
                          <span className="font-extrabold text-primary">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        {pct > 0 && pct < 100 ? "চালিয়ে যান" : pct === 100 ? "আবার দেখুন" : "শুরু করুন"}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[var(--shadow-glow)]">
                        <PlayCircle className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
