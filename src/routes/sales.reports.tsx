import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import ReportsPage from "@/components/sales/reports/ReportsPage";
import { useSalesAuth } from "@/contexts/SalesAuthContext";

export const Route = createFileRoute("/sales/reports")({
  component: ReportsRoute,
});

function ReportsRoute() {
  const { salesUser, loading } = useSalesAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && salesUser && salesUser.role !== "admin") {
      navigate({ to: "/sales" });
    }
  }, [loading, salesUser, navigate]);
  if (loading || !salesUser || salesUser.role !== "admin") return null;
  return <ReportsPage />;
}
