import { createFileRoute } from "@tanstack/react-router";
import { LeadDetail } from "@/components/sales/leads/detail/LeadDetail";

export const Route = createFileRoute("/sales/leads/$id")({
  component: LeadDetailRoute,
});

function LeadDetailRoute() {
  const { id } = Route.useParams();
  return <LeadDetail leadId={id} />;
}
