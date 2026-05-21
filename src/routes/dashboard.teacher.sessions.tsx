import { createFileRoute } from "@tanstack/react-router";
import { SessionsManager } from "@/components/course/SessionsManager";

export const Route = createFileRoute("/dashboard/teacher/sessions")({
  component: () => <SessionsManager mode="teacher" title="আমার লাইভ ক্লাস লিংক" />,
});
