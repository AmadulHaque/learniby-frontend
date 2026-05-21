import { Link } from "@tanstack/react-router";

export function AuthTabs({ active }: { active: "login" | "register" }) {
  const Tab = ({ to, label, isActive }: { to: "/dashboard/login" | "/dashboard/register"; label: string; isActive: boolean }) => (
    <Link
      to={to}
      className={[
        "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition",
        isActive
          ? "bg-gradient-to-r from-primary to-[var(--primary-glow)] text-primary-foreground shadow"
          : "text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );

  return (
    <div className="mb-6 flex gap-2 rounded-2xl border bg-slate-50 p-1">
      <Tab to="/dashboard/login" label="লগইন" isActive={active === "login"} />
      <Tab to="/dashboard/register" label="রেজিস্ট্রেশন" isActive={active === "register"} />
    </div>
  );
}
