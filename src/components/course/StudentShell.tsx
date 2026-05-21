import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Monitor,
  Radio,
  FileText,
  BookOpen,
  Award,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
} from "lucide-react";
import logo from "@/assets/marketing/learniby-logo.webp";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  label: string;
  to:
    | "/dashboard"
    | "/dashboard/my-course"
    | "/dashboard/live-class"
    | "/dashboard/billing"
    | "/dashboard/ebook"
    | "/dashboard/certificate"
    | "/dashboard/profile";
  icon: typeof LayoutGrid;
};

const NAV: NavItem[] = [
  { label: "ড্যাশবোর্ড", to: "/dashboard", icon: LayoutGrid },
  { label: "আমার কোর্স", to: "/dashboard/my-course", icon: Monitor },
  { label: "লাইভ ক্লাস", to: "/dashboard/live-class", icon: Radio },
  { label: "বিলিং ও রিপোর্ট", to: "/dashboard/billing", icon: FileText },
  { label: "ই-বুক", to: "/dashboard/ebook", icon: BookOpen },
  { label: "সার্টিফিকেট", to: "/dashboard/certificate", icon: Award },
  { label: "প্রোফাইল", to: "/dashboard/profile", icon: UserCircle2 },
];

const BRAND = {
  primary: "#7B1CB8",
  primaryDeep: "#5B1391",
  bg: "#F7F1FB",
  accent: "#FB7185",
};

export function StudentShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const name =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "শিক্ষার্থী";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.bg }}>
      {/* Top white bar with logo + actions */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center" aria-label="Learniby">
          <img src={logo} alt="Learniby" className="h-10 w-auto sm:h-11" />
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
        {/* Sidebar */}
        <aside
          className={[
            "sticky top-[88px] hidden h-[calc(100vh-104px)] shrink-0 flex-col rounded-2xl bg-white shadow-sm transition-[width] duration-200 md:flex",
            collapsed ? "w-[78px]" : "w-[240px]",
          ].join(" ")}
        >
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const isActive =
                item.to === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/dashboard/"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition",
                    isActive
                      ? "text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                  style={isActive ? { background: BRAND.primary } : undefined}
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

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
          {NAV.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold"
                style={{ color: isActive ? BRAND.primary : "#64748b" }}
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
