import { defineRoute } from "@/lib/router-compat";
import { LeadDetail } from "@/components/sales/leads/detail/LeadDetail";

export const Route = defineRoute("/sales/leads/$id")({
  component: LeadDetailRoute,
});

function LeadDetailRoute() {
  const { id } = Route.useParams();
  return <LeadDetail leadId={id} />;
}
