import { useEffect } from "react";
import { defineRoute, useNavigate } from "@/lib/router-compat";
import { CoursesTab } from "@/components/sales/settings/SettingsPage";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { BookOpen } from "lucide-react";

export const Route = defineRoute("/sales/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { salesUser, loading } = useSalesAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && salesUser && salesUser.role !== "admin") {
      navigate({ to: "/sales" });
    }
  }, [loading, salesUser, navigate]);

  if (loading || !salesUser || salesUser.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Courses & Pricing
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your course catalogue and default deal prices.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <CoursesTab />
      </div>
    </div>
  );
}
