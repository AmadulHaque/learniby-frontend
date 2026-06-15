import { defineRoute } from "@/lib/router-compat";
import { LeadsPage } from "@/components/sales/leads/LeadsPage";

export const Route = defineRoute("/sales/leads")({
  component: LeadsPage,
});
