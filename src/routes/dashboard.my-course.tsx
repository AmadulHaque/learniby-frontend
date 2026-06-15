import { defineRoute, Navigate, Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/course/StudentShell";
import { Monitor, PlayCircle, Loader2 } from "lucide-react";

export const Route = defineRoute("/dashboard/my-course")({
  component: MyCoursePage,
  head: () => ({ meta: [{ title: "আমার কোর্স — Learniby" }] }),
});

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

function MyCoursePage() {
  const { user, loading } = useAuth();
  const [courses, setCourses] = useState<CourseRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: en } = await supabase
        .from("enrollments")
        .select("course_id, courses(id,title,description,thumbnail_url)")
        .eq("user_id", user.id);
      const list: CourseRow[] = (en ?? [])
        .flatMap((e: { courses: CourseRow | CourseRow[] | null }) =>
          Array.isArray(e.courses) ? e.courses : e.courses ? [e.courses] : [],
        );
      setCourses(list);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

  return (
    <StudentShell>
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">All Courses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Total {courses?.length ?? 0} courses assigned
        </p>

        {courses === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : courses.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Monitor className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">You have no courses</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                to="/dashboard/course/$courseId"
                params={{ courseId: c.id }}
                className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-100 to-fuchsia-100">
                  {c.thumbnail_url ? (
                    <img
                      src={c.thumbnail_url}
                      alt={c.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <PlayCircle className="h-12 w-12 text-purple-400" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">{c.title}</h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
