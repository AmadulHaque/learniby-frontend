import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { PanelShell, type PanelNavItem } from "@/components/course/PanelShell";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  BookOpen,
  Radio,
  GraduationCap,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminLayout,
});

const NAV: PanelNavItem[] = [
  { label: "ড্যাশবোর্ড", to: "/dashboard/admin", icon: LayoutDashboard, exact: true },
  { label: "অনুমোদন", to: "/dashboard/admin/pending", icon: UserPlus },
  { label: "ছাত্র/ছাত্রী", to: "/dashboard/admin/students", icon: Users },
  { label: "শিক্ষক", to: "/dashboard/admin/teachers", icon: Briefcase },
  { label: "ম্যানেজার", to: "/dashboard/admin/managers", icon: ShieldCheck },
  { label: "কোর্স", to: "/dashboard/admin/courses", icon: BookOpen },
  { label: "লাইভ ক্লাস লিংক", to: "/dashboard/admin/sessions", icon: Radio },
];

function AdminLayout() {
  const { user, role, loading } = useAuth();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7B1CB8" }} />
      </div>
    );
  if (!user) return <Navigate to="/dashboard/login" />;
  if (role !== "admin")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-sm text-muted-foreground">এই অংশ শুধু অ্যাডমিনদের জন্য।</p>
      </div>
    );

  return (
    <PanelShell nav={NAV} badge="Admin" homeTo="/dashboard/admin">
      <Outlet />
    </PanelShell>
  );
}
