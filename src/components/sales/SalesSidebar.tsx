import { Link, useRouterState } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  
  BarChart2,
  Settings,
  LogOut,
  Sparkles,
  UserCog,
  Wallet,
  BookOpen,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  adminOnly?: boolean;
  /** tailwind gradient classes for the active "pop" pill */
  accent: string;
};

const NAV: NavItem[] = [
  { to: "/sales", label: "Dashboard", icon: LayoutDashboard, accent: "from-sky-400 to-indigo-500" },
  { to: "/sales/leads", label: "All Leads", icon: Users, accent: "from-fuchsia-400 to-pink-500" },
  
  { to: "/sales/accounting", label: "Sales History", icon: Wallet, accent: "from-cyan-400 to-blue-500" },
  { to: "/sales/expenses", label: "Expenses", icon: Receipt, adminOnly: true, accent: "from-rose-400 to-pink-500" },
  { to: "/sales/courses", label: "Courses", icon: BookOpen, adminOnly: true, accent: "from-amber-400 to-orange-500" },
  { to: "/sales/reports", label: "Reports", icon: BarChart2, adminOnly: true, accent: "from-emerald-300 to-teal-500" },
  { to: "/sales/settings", label: "Settings", icon: Settings, adminOnly: true, accent: "from-violet-400 to-purple-600" },
];

export function SalesSidebar({
  collapsed,
  role = "admin",
  user = { name: "Demo User", email: "demo@learniby.com", avatar_url: null, designation: null },
  onLogout,
  onOpenProfile,
}: {
  collapsed: boolean;
  role?: "admin" | "executive";
  user?: { name: string; email: string; avatar_url?: string | null; designation?: string | null };
  onLogout?: () => void;
  onOpenProfile?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/sales" ? pathname === "/sales" : pathname.startsWith(to);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="hidden md:flex sticky top-0 h-screen flex-col overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(168deg, #0B1027 0%, #161A4A 38%, #2A1B5E 72%, #3B1A6E 100%)",
      }}
    >
      {/* Decorative glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 flex h-16 items-center gap-2.5 px-4 border-b border-white/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-pink-500 to-orange-400 text-white shadow-[0_8px_24px_-6px_rgba(236,72,153,0.6)]">
          <Sparkles className="h-5 w-5" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="leading-tight"
          >
            <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
              Learniby
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
              Sales Suite
            </div>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {NAV.filter((n) => !n.adminOnly || role === "admin").map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all overflow-hidden",
                    active
                      ? "text-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.7)]"
                      : "text-white/90 hover:text-white hover:bg-white/10",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sales-nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className={cn(
                        "absolute inset-0 -z-0 rounded-xl bg-gradient-to-r opacity-95",
                        item.accent,
                      )}
                    />
                  )}
                  {active && (
                    <span className="absolute inset-0 -z-0 rounded-xl ring-1 ring-white/25" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                      active
                        ? "bg-white/25 backdrop-blur-sm text-white"
                        : "bg-white/15 text-white group-hover:bg-white/25",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                      className="relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <div className="mt-6 mx-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-3 backdrop-blur-md">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-200/80">
              Pro tip
            </div>
            <p className="mt-1 text-xs text-white/70 leading-relaxed">
              Press{" "}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white">
                /
              </kbd>{" "}
              to quickly search leads.
            </p>
          </div>
        )}
      </nav>

      {/* User panel */}
      <div className="relative z-10 border-t border-white/10 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 backdrop-blur-md">
          <button
            onClick={onOpenProfile}
            className="flex w-full items-center gap-3 text-left transition hover:opacity-95"
          >
            <Avatar
              name={user.name}
              src={user.avatar_url ?? null}
              size={collapsed ? 38 : 40}
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-bold text-white">{user.name}</div>
                <div className="truncate text-[11px] text-white/55">
                  {user.designation || (role === "admin" ? "Sales Admin" : "Sales Executive")}
                </div>
              </div>
            )}
          </button>

          {!collapsed && (
            <div className="mt-2.5 flex items-center gap-1 border-t border-white/10 pt-2.5">
              <button
                onClick={onOpenProfile}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <UserCog className="h-3.5 w-3.5" />
                Profile
              </button>
              <button
                onClick={onLogout}
                title="Logout"
                className="flex h-7 w-9 items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {collapsed && (
            <button
              onClick={onLogout}
              title="Logout"
              className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

function Avatar({ name, src, size = 40 }: { name: string; src: string | null; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 rounded-full p-[2px]"
      style={{
        width: size,
        height: size,
        background:
          "conic-gradient(from 140deg, #f472b6, #818cf8, #38bdf8, #f472b6)",
      }}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#10142E] text-xs font-extrabold text-white">
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
    </div>
  );
}
