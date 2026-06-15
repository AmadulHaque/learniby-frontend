import { defineRoute, useNavigate } from "@/lib/router-compat";
import { useEffect } from "react";
import ReportsPage from "@/components/sales/reports/ReportsPage";
import { useSalesAuth } from "@/contexts/SalesAuthContext";

export const Route = defineRoute("/sales/reports")({
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
