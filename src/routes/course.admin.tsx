import { createFileRoute, Outlet, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Loader2, Users, BookOpen, GraduationCap, LayoutDashboard, UserPlus, Briefcase } from "lucide-react";

export const Route = createFileRoute("/course/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdminLike, isMaster, loading } = useAuth();
  const loc = useLocation();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/course/login" />;
  if (!isAdminLike)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-sm text-muted-foreground">এই অংশ শুধু অ্যাডমিন/শিক্ষকদের জন্য।</p>
      </div>
    );

  const tabs: { to: string; label: string; icon: typeof Users; exact?: boolean; masterOnly?: boolean }[] = [
    { to: "/course/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard, exact: true },
    { to: "/course/admin/pending", label: "অনুমোদন", icon: UserPlus },
    { to: "/course/admin/students", label: "ছাত্র", icon: Users },
    { to: "/course/admin/teachers", label: "শিক্ষক", icon: Briefcase, masterOnly: true },
    { to: "/course/admin/courses", label: "কোর্স", icon: BookOpen },
  ];

  const visibleTabs = tabs.filter((t) => !t.masterOnly || isMaster);

  return (
    <div className="min-h-screen bg-muted/40 pb-20">
      <AppHeader />
      <div className="border-b-2 border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:gap-2 sm:px-4">
          {visibleTabs.map((t) => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to as any}
                className={`group relative flex shrink-0 items-center gap-2 px-4 py-4 text-sm font-bold transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 transition ${active ? "scale-110" : ""}`} />
                {t.label}
                <span
                  className={`absolute inset-x-2 bottom-0 h-1 rounded-t-full transition ${
                    active ? "bg-gradient-to-r from-primary to-[var(--primary-glow)]" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
