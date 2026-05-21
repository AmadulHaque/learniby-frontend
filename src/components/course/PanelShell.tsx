import { type ReactNode, useState, type ComponentType } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Bell, LogOut } from "lucide-react";
import logo from "@/assets/marketing/learniby-logo.webp";
import { useAuth } from "@/contexts/AuthContext";

export type PanelNavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

const BRAND = {
  primary: "#7B1CB8",
  primaryDeep: "#5B1391",
  bg: "#F7F1FB",
  accent: "#FB7185",
};

export function PanelShell({
  children,
  nav,
  badge,
  homeTo = "/dashboard",
}: {
  children: ReactNode;
  nav: PanelNavItem[];
  badge?: string;
  homeTo?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const name =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";
  const initial = name.charAt(0).toUpperCase();

  const isActive = (item: PanelNavItem) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");

  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.bg }}>
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
        <Link to={homeTo as any} className="flex items-center gap-3" aria-label="Learniby">
          <img src={logo} alt="Learniby" className="h-10 w-auto sm:h-11" />
          {badge && (
            <span
              className="hidden rounded-full px-3 py-1 text-xs font-bold text-white sm:inline"
              style={{ background: BRAND.primary }}
            >
              {badge}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-full font-bold text-white"
              style={{ background: BRAND.accent }}
            >
              {initial}
            </span>
            <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{name}</span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            title="লগআউট"
            aria-label="Log out"
            className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-3 py-6 sm:px-6">
        <aside
          className={[
            "sticky top-[88px] hidden h-[calc(100vh-104px)] shrink-0 flex-col rounded-2xl bg-white shadow-sm transition-[width] duration-200 md:flex",
            collapsed ? "w-[78px]" : "w-[240px]",
          ].join(" ")}
        >
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition",
                    active ? "text-white shadow-sm" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                  style={active ? { background: BRAND.primary } : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="m-3 grid h-9 w-9 place-items-center self-start rounded-full text-slate-500 hover:bg-slate-100"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold"
                style={{ color: active ? BRAND.primary : "#64748b" }}
              >
                <Icon className="h-5 w-5" />
                <span className="line-clamp-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
