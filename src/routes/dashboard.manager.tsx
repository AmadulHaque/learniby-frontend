import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { PanelShell, type PanelNavItem } from "@/components/course/PanelShell";
import {
  LayoutDashboard, Users, Building2, BookOpen, Radio, Loader2, GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/manager")({
  component: ManagerLayout,
});

const NAV: PanelNavItem[] = [
  { label: "ড্যাশবোর্ড", to: "/dashboard/manager", icon: LayoutDashboard, exact: true },
  { label: "ছাত্র/ছাত্রী", to: "/dashboard/manager/students", icon: Users },
  { label: "ব্যাচ", to: "/dashboard/manager/batches", icon: Building2 },
  { label: "কোর্স", to: "/dashboard/manager/courses", icon: BookOpen },
  { label: "লাইভ ক্লাস লিংক", to: "/dashboard/manager/sessions", icon: Radio },
];

function ManagerLayout() {
  const { user, role, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7B1CB8" }} />
      </div>
    );
  if (!user) return <Navigate to="/dashboard/login" />;
  if (role !== "manager" && role !== "admin")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-sm text-muted-foreground">এই অংশ শুধু ম্যানেজার/অ্যাডমিনদের জন্য।</p>
      </div>
    );
  return (
    <PanelShell nav={NAV} badge="Manager" homeTo="/dashboard/manager">
      <Outlet />
    </PanelShell>
  );
}
