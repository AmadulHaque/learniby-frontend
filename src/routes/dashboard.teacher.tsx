import { defineRoute, Outlet, Navigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { PanelShell, type PanelNavItem } from "@/components/course/PanelShell";
import { LayoutDashboard, Radio, Loader2, GraduationCap } from "lucide-react";

export const Route = defineRoute("/dashboard/teacher")({
  component: TeacherLayout,
});

const NAV: PanelNavItem[] = [
  { label: "ড্যাশবোর্ড", to: "/dashboard/teacher", icon: LayoutDashboard, exact: true },
  { label: "লাইভ ক্লাস লিংক", to: "/dashboard/teacher/sessions", icon: Radio },
];

function TeacherLayout() {
  const { user, role, loading } = useAuth();
  if (loading)
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7B1CB8" }} /></div>;
  if (!user) return <Navigate to="/dashboard/login" />;
  if (role !== "teacher" && role !== "admin" && role !== "manager")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-sm text-muted-foreground">এই অংশ শুধু শিক্ষকদের জন্য।</p>
      </div>
    );
  return (
    <PanelShell nav={NAV} badge="Teacher" homeTo="/dashboard/teacher">
      <Outlet />
    </PanelShell>
  );
}
