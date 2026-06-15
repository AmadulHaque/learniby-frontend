import { defineRoute } from "@/lib/router-compat";
import { SessionsManager } from "@/components/course/SessionsManager";

export const Route = defineRoute("/dashboard/admin/sessions")({
  component: () => <SessionsManager mode="manage" title="লাইভ ক্লাস লিংক" />,
});
