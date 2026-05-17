import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/components/sales/leads/LeadsPage";

export const Route = createFileRoute("/sales/leads")({
  component: LeadsPage,
});
