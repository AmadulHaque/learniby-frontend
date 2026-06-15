import { defineRoute, Outlet, useNavigate, useRouterState } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SalesSidebar } from "@/components/sales/SalesSidebar";
import { SalesTopBar } from "@/components/sales/SalesTopBar";
import { SalesMobileNav } from "@/components/sales/SalesMobileNav";
import { ProfileDialog } from "@/components/sales/ProfileDialog";
import { SalesAuthProvider, useSalesAuth } from "@/contexts/SalesAuthContext";
import { SalesStatusesProvider } from "@/contexts/SalesStatusesContext";
import { SalesCoursesProvider } from "@/contexts/SalesCoursesContext";
import { SalesSourcesProvider } from "@/contexts/SalesSourcesContext";
import { SalesPrioritiesProvider } from "@/contexts/SalesPrioritiesContext";
import { SalesPaymentMethodsProvider } from "@/contexts/SalesPaymentMethodsContext";
import { SalesExpenseCategoriesProvider } from "@/contexts/SalesExpenseCategoriesContext";

export const Route = defineRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Learniby LMS — Sales Panel" },
      { name: "description", content: "Lead Management System for Learniby EdTech sales team." },
    ],
  }),
  component: SalesShell,
});

function SalesShell() {
  return (
    <SalesAuthProvider>
      <SalesStatusesProvider>
        <SalesCoursesProvider>
          <SalesSourcesProvider>
            <SalesPrioritiesProvider>
              <SalesPaymentMethodsProvider>
                <SalesExpenseCategoriesProvider>
                  <SalesLayout />
                </SalesExpenseCategoriesProvider>
              </SalesPaymentMethodsProvider>
            </SalesPrioritiesProvider>
          </SalesSourcesProvider>
        </SalesCoursesProvider>
      </SalesStatusesProvider>
    </SalesAuthProvider>
  );
}

function SalesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/sales/login";
  const { loading, salesUser, signOut } = useSalesAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 768) setCollapsed(true);
      else if (window.innerWidth >= 1280) setCollapsed(false);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // Guard: redirect unauthenticated to /sales/login
  useEffect(() => {
    if (!loading && !salesUser && !isLoginRoute) {
      navigate({ to: "/sales/login" });
    }
  }, [loading, salesUser, isLoginRoute, navigate]);

  // Login route: render outlet bare (no sidebar)
  if (isLoginRoute) {
    return <Outlet />;
  }

  // Loading or redirecting
  if (loading || !salesUser) {
    return (
      <div className="sales-theme flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="sales-theme min-h-screen bg-background text-foreground">
      <div className="flex">
        <SalesSidebar
          collapsed={collapsed}
          role={salesUser.role}
          user={{
            name: salesUser.full_name,
            email: salesUser.email,
            avatar_url: salesUser.avatar_url,
            designation: salesUser.designation,
          }}
          onOpenProfile={() => setProfileOpen(true)}
          onLogout={async () => {
            await signOut();
            navigate({ to: "/sales/login" });
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <SalesTopBar
            onToggleSidebar={() => setCollapsed((c) => !c)}
            notificationCount={0}
            user={{ name: salesUser.full_name, avatar_url: salesUser.avatar_url }}
            onOpenProfile={() => setProfileOpen(true)}
          />
          <main className="flex-1 px-4 sm:px-6 py-6 pb-24 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      <SalesMobileNav />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
