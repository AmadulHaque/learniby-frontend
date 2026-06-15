import { useEffect } from "react";
import { defineRoute, useNavigate } from "@/lib/router-compat";
import { ExpensesPage } from "@/components/sales/expenses/ExpensesPage";
import { useSalesAuth } from "@/contexts/SalesAuthContext";

export const Route = defineRoute("/sales/expenses")({
  component: ExpensesRoute,
});

function ExpensesRoute() {
  const { salesUser, loading } = useSalesAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && salesUser && salesUser.role !== "admin") {
      navigate({ to: "/sales" });
    }
  }, [loading, salesUser, navigate]);

  if (loading || !salesUser || salesUser.role !== "admin") return null;
  return <ExpensesPage />;
}
