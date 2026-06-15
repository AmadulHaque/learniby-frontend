import { Link, useRouterState } from "@/lib/router-compat";
import { LayoutDashboard, Users, Wallet, BarChart2, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/sales", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales/leads", label: "Leads", icon: Users },
  { to: "/sales/accounting", label: "Sales", icon: Wallet },
  { to: "/sales/reports", label: "Reports", icon: BarChart2 },
  { to: "/sales/settings", label: "Profile", icon: UserIcon },
];

export function SalesMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/sales" ? pathname === "/sales" : pathname.startsWith(to);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="grid h-full grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
