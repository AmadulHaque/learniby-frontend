import { createFileRoute } from "@tanstack/react-router";
import { SessionsManager } from "@/components/course/SessionsManager";

export const Route = createFileRoute("/dashboard/admin/sessions")({
  component: () => <SessionsManager mode="manage" title="লাইভ ক্লাস লিংক" />,
});
