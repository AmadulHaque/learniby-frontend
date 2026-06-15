import { defineRoute } from "@/lib/router-compat";
import { SessionsManager } from "@/components/course/SessionsManager";

export const Route = defineRoute("/dashboard/teacher/sessions")({
  component: () => <SessionsManager mode="teacher" title="আমার লাইভ ক্লাস লিংক" />,
});
