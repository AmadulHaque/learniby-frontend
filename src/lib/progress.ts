import { supabase } from "@/integrations/supabase/client";

export interface ProgressRow {
  video_id: string;
  course_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

export async function upsertProgress(opts: {
  userId: string;
  videoId: string;
  courseId: string;
  watchedSeconds: number;
  completed: boolean;
}) {
  return supabase.from("video_progress").upsert(
    {
      user_id: opts.userId,
      video_id: opts.videoId,
      course_id: opts.courseId,
      watched_seconds: opts.watchedSeconds,
      completed: opts.completed,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,video_id" }
  );
}

export async function fetchUserProgress(userId: string) {
  const { data } = await supabase
    .from("video_progress")
    .select("video_id,course_id,watched_seconds,completed,last_watched_at")
    .eq("user_id", userId);
  return (data ?? []) as ProgressRow[];
}
