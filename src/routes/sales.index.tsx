import { defineRoute, Link } from "@/lib/router-compat";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Wallet, Target, Phone, MessageCircle, Mail,
  Trophy, Clock, AlertTriangle, Activity, BookOpen, ArrowUpRight,
  CalendarCheck, Flame, PlusCircle, Loader2, Calendar as CalendarIcon,
} from "lucide-react";
import { Leads, SalesUsers, Activities, Expenses, Targets } from "@/lib/sales-api";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { formatMoney, avatarFor, relativeTime, STATUS_META, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

export const Route = defineRoute("/sales/")({
  component: SalesDashboard,
});

interface LeadLite {
  id: string; full_name: string; phone: string; status: LeadStatus;
  assigned_to: string | null; created_at: string; deal_value: number | null;
  won_at: string | null; follow_up_date: string | null; courses: string[];
  last_activity_at: string | null;
}
interface UserLite { id: string; full_name: string; role: string; avatar_url: string | null; }
interface ActivityLite { id: string; type: string; title: string; created_at: string; lead_id: string; lead: { full_name: string } | null; }

function SalesDashboard() {
  const { salesUser } = useSalesAuth();
  const { active: activeStatuses, isWon } = useSalesStatuses();
  const isAdmin = salesUser?.role === "admin";

  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [activities, setActivities] = useState<ActivityLite[]>([]);
  const [expensesMonth, setExpensesMonth] = useState(0);
  const [targets, setTargets] = useState<{ sales_user_id: string; target_amount: number; period_type: "month" | "quarter" }[]>([]);
  const [loading, setLoading] = useState(true);

  type PresetKey = "today" | "7d" | "30d" | "this_month" | "last_month" | "this_year" | "all" | "custom";
  const presets: { key: PresetKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
    { key: "this_year", label: "This year" },
    { key: "all", label: "All time" },
  ];
  const [preset, setPreset] = useState<PresetKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    let s: Date, e: Date, label: string;
    switch (preset) {
      case "today":       s = startOfDay(now); e = addDays(s, 1); label = "Today"; break;
      case "7d":          e = addDays(startOfDay(now), 1); s = addDays(e, -7); label = "Last 7 days"; break;
      case "30d":         e = addDays(startOfDay(now), 1); s = addDays(e, -30); label = "Last 30 days"; break;
      case "last_month": {
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 1);
        label = s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        break;
      }
      case "this_year":   s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear() + 1, 0, 1); label = String(now.getFullYear()); break;
      case "all":         s = new Date(2000, 0, 1); e = addDays(startOfDay(now), 1); label = "All time"; break;
      case "custom": {
        if (customRange?.from) {
          s = startOfDay(customRange.from);
          e = addDays(startOfDay(customRange.to ?? customRange.from), 1);
          const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          label = customRange.to && customRange.to.getTime() !== customRange.from.getTime()
            ? `${fmt(s)} – ${fmt(addDays(e, -1))}`
            : fmt(s);
        } else {
          s = new Date(now.getFullYear(), now.getMonth(), 1);
          e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          label = s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        }
        break;
      }
      case "this_month":
      default:
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        label = s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return { rangeStart: s, rangeEnd: e, rangeLabel: label };
  }, [preset, customRange]);

  useEffect(() => {
    if (!salesUser) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const monthStartIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterStartIso = `${qStart.getFullYear()}-${String(qStart.getMonth() + 1).padStart(2, "0")}-01`;

      try {
        const [l, u, a, e, tgMonth, tgQuarter] = await Promise.all([
          Leads.list({ sort: "created_at", direction: "desc", per_page: 5000 }),
          SalesUsers.list(),
          Activities.listAll({ per_page: 8 }),
          isAdmin
            ? Expenses.list({
                from: rangeStart.toISOString().slice(0, 10),
                to: rangeEnd.toISOString().slice(0, 10),
                per_page: 5000,
              })
            : Promise.resolve({ data: [] as { amount: number }[] } as never),
          Targets.list({ month: monthStartIso, period_type: "month" }),
          Targets.list({ month: quarterStartIso, period_type: "quarter" }),
        ]);
        if (cancel) return;
        setLeads((l.data ?? []) as unknown as LeadLite[]);
        setUsers((u.data ?? []) as unknown as UserLite[]);
        setActivities((a.data ?? []) as unknown as ActivityLite[]);
        const exTot = (((e as { data?: { amount: number | string }[] }).data ?? []) as { amount: number | string }[])
          .reduce((s, x) => s + Number(x.amount ?? 0), 0);
        setExpensesMonth(exTot);
        const monthRows = ((tgMonth.data ?? []) as unknown as { sales_user_id: string; target_amount: number }[])
          .map((r) => ({ ...r, period_type: "month" as const }));
        const quarterRows = ((tgQuarter.data ?? []) as unknown as { sales_user_id: string; target_amount: number }[])
          .map((r) => ({ ...r, period_type: "quarter" as const }));
        setTargets([...monthRows, ...quarterRows]);
      } catch (err) {
        console.error("Sales dashboard load failed", err);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesUser, isAdmin, rangeStart.getTime(), rangeEnd.getTime()]);

  // ============ Computations ============
  const inRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= rangeStart.getTime() && t < rangeEnd.getTime();
  };
  const allMyLeads = isAdmin ? leads : leads.filter((l) => l.assigned_to === salesUser?.id);
  // Filter leads by created_at within range for the KPIs that depend on creation period.
  const myLeads = allMyLeads.filter((l) => inRange(l.created_at));
  const totalLeads = myLeads.length;
  const wonLeads = myLeads.filter((l) => isWon(l.status));
  const monthWon = allMyLeads.filter((l) => isWon(l.status) && inRange(l.won_at));
  const monthRevenue = monthWon.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
  const monthProfit = monthRevenue - expensesMonth;
  const convPct = totalLeads ? (wonLeads.length / totalLeads) * 100 : 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayFollowUps = allMyLeads.filter((l) => l.follow_up_date && new Date(l.follow_up_date) >= today && new Date(l.follow_up_date) < tomorrow);
  const overdueFollowUps = allMyLeads.filter((l) => l.follow_up_date && new Date(l.follow_up_date) < today && !isWon(l.status));
  const newToday = allMyLeads.filter((l) => new Date(l.created_at) >= today);
  const hotLeads = allMyLeads.filter((l) => l.status === "ready_for_class" || l.status === "follow_up").slice(0, 5);

  // Status distribution
  const statusDist = activeStatuses.map((s) => ({
    key: s.key, label: s.label, count: myLeads.filter((l) => l.status === s.key).length,
    color: s.color || "#64748B",
  }));
  const maxStatus = Math.max(1, ...statusDist.map((s) => s.count));

  // Top performers (admin only)
  const reps = users.filter((u) => u.role === "executive");
  const topPerformers = reps.map((rep) => {
    const sales = monthWon.filter((l) => l.assigned_to === rep.id);
    return { rep, sales: sales.length, revenue: sales.reduce((s, l) => s + Number(l.deal_value ?? 0), 0) };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  // Unassigned leads (admin only) — leads with no assignee
  const unassigned = leads.filter((l) => !l.assigned_to).length;

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const KPI = [
    { label: isAdmin ? "Total Leads" : "My Leads", value: String(totalLeads), sub: `${newToday.length} new today`, gradient: "from-blue-600 via-indigo-600 to-violet-600", icon: Users },
    { label: `${isAdmin ? "Team" : "My"} Revenue · ${rangeLabel}`, value: formatMoney(monthRevenue), sub: `${monthWon.length} deals won`, gradient: "from-emerald-500 via-teal-500 to-cyan-500", icon: TrendingUp },
    ...(isAdmin ? [{ label: `${rangeLabel} Profit`, value: formatMoney(monthProfit), sub: `Expenses ${formatMoney(expensesMonth)}`, gradient: monthProfit >= 0 ? "from-violet-600 via-purple-600 to-fuchsia-600" : "from-rose-500 via-red-500 to-orange-500", icon: Wallet }] : []),
    { label: isAdmin ? "Conversion" : "My Conversion", value: `${convPct.toFixed(1)}%`, sub: `${wonLeads.length} won total`, gradient: "from-amber-500 via-orange-500 to-rose-500", icon: Target },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* WELCOME */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {isAdmin ? "Admin Dashboard" : "My Dashboard"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {salesUser?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? `Team-wide overview — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
              : `Your personal pipeline & follow-ups — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span>{rangeLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <div className="flex">
                <div className="flex w-36 flex-col border-r border-border p-2">
                  {presets.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => { setPreset(p.key); if (p.key !== "custom") setPickerOpen(false); }}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-muted",
                        preset === p.key && "bg-primary/10 text-primary",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPreset("custom")}
                    className={cn(
                      "mt-1 rounded-md border-t border-border px-2.5 py-1.5 text-left text-xs font-medium hover:bg-muted",
                      preset === "custom" && "bg-primary/10 text-primary",
                    )}
                  >
                    Custom…
                  </button>
                </div>
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(r) => { setCustomRange(r); setPreset("custom"); }}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
            </PopoverContent>
          </Popover>
          <Link to="/sales/leads" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-95">
            <PlusCircle className="h-4 w-4" /> View All Leads
          </Link>
          <Link to="/sales/reports" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">
            <Activity className="h-4 w-4" /> Reports
          </Link>
        </div>
      </div>

      {/* HERO KPI */}
      <div className={cn("grid gap-3 grid-cols-2", isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {KPI.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.gradient} p-5 text-white shadow-lg`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">{k.label}</div>
                  <div className="mt-2 text-2xl font-extrabold">{k.value}</div>
                  <div className="mt-0.5 text-xs text-white/80">{k.sub}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur"><Icon className="h-5 w-5" /></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* SECONDARY STAT CARDS — same vibrant gradient style as hero */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatPill icon={CalendarCheck} label="Today's Follow-ups" value={todayFollowUps.length} gradient="from-cyan-500 via-sky-500 to-blue-500" link="/sales/leads" />
        <StatPill icon={AlertTriangle} label="Overdue" value={overdueFollowUps.length} gradient="from-rose-500 via-red-500 to-orange-500" link="/sales/leads" />
        <StatPill icon={Flame} label="Hot Leads" value={hotLeads.length} gradient="from-orange-500 via-amber-500 to-yellow-500" link="/sales/leads" />
        <StatPill icon={PlusCircle} label="New Today" value={newToday.length} gradient="from-emerald-500 via-teal-500 to-cyan-500" link="/sales/leads" />
        {isAdmin && <StatPill icon={Users} label="Unassigned" value={unassigned} gradient="from-violet-600 via-purple-600 to-fuchsia-600" link="/sales/leads" />}
      </div>

      {/* SALES TARGET PROGRESS */}
      {(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const qEnd = new Date(qStart); qEnd.setMonth(qEnd.getMonth() + 3);
        const inWin = (iso: string | null, s: Date, e: Date) => !!iso && new Date(iso).getTime() >= s.getTime() && new Date(iso).getTime() < e.getTime();

        const scopeLeads = allMyLeads;
        const monthAchieved = scopeLeads.filter((l) => isWon(l.status) && inWin(l.won_at, monthStart, monthEnd)).reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
        const qAchieved = scopeLeads.filter((l) => isWon(l.status) && inWin(l.won_at, qStart, qEnd)).reduce((s, l) => s + Number(l.deal_value ?? 0), 0);

        const allowedIds = isAdmin ? null : new Set([salesUser?.id ?? ""]);
        const monthTarget = targets.filter((t) => t.period_type === "month" && (!allowedIds || allowedIds.has(t.sales_user_id))).reduce((s, t) => s + Number(t.target_amount ?? 0), 0);
        const qTarget = targets.filter((t) => t.period_type === "quarter" && (!allowedIds || allowedIds.has(t.sales_user_id))).reduce((s, t) => s + Number(t.target_amount ?? 0), 0);

        const monthLabel2 = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const qLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

        if (monthTarget === 0 && qTarget === 0) return null;

        const repsList = users.filter((u) => u.role === "executive");
        const perRep = isAdmin ? repsList.map((rep) => {
          const t = targets.find((x) => x.period_type === "month" && x.sales_user_id === rep.id)?.target_amount ?? 0;
          const ach = scopeLeads.filter((l) => l.assigned_to === rep.id && isWon(l.status) && inWin(l.won_at, monthStart, monthEnd))
            .reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
          return { rep, target: Number(t), achieved: ach };
        }).filter((r) => r.target > 0).sort((a, b) => (b.achieved / Math.max(b.target, 1)) - (a.achieved / Math.max(a.target, 1))) : [];

        return (
          <Card>
            <CardHeader
              icon={<Target className="h-4 w-4" />}
              title={isAdmin ? "Team Sales Targets" : "My Sales Targets"}
              link={isAdmin ? "/sales/settings" : undefined}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TargetBar label={`Monthly — ${monthLabel2}`} achieved={monthAchieved} target={monthTarget} />
              <TargetBar label={`Quarterly — ${qLabel}`} achieved={qAchieved} target={qTarget} />
            </div>
            {isAdmin && perRep.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <div className="text-[11px] font-bold uppercase text-muted-foreground">By Rep — {monthLabel2}</div>
                {perRep.map((r) => {
                  const pct = r.target > 0 ? Math.min(100, Math.round((r.achieved / r.target) * 100)) : 0;
                  const av = avatarFor(r.rep.full_name);
                  return (
                    <div key={r.rep.id} className="flex items-center gap-3">
                      <div className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white", av.color)}>{av.initials}</div>
                      <div className="w-32 truncate text-xs font-semibold">{r.rep.full_name}</div>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full bg-gradient-to-r", pct >= 100 ? "from-emerald-500 to-teal-500" : pct >= 70 ? "from-blue-500 to-indigo-500" : pct >= 40 ? "from-amber-400 to-orange-500" : "from-rose-400 to-red-500")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="hidden sm:block w-32 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">{formatMoney(r.achieved)} / {formatMoney(r.target)}</div>
                      <div className="w-10 text-right text-xs font-bold">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })()}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* PIPELINE */}
        <Card className="lg:col-span-2">
          <CardHeader icon={<BookOpen className="h-4 w-4" />} title={isAdmin ? "Pipeline by Status" : "My Pipeline"} />
          <div className="space-y-2">
            {statusDist.length === 0 && <p className="text-sm text-muted-foreground">No leads yet.</p>}
            {statusDist.map((s) => {
              const meta = STATUS_META[s.key as LeadStatus];
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-32 truncate text-xs font-semibold">{meta?.label ?? s.label}</div>
                  <div className="flex-1">
                    <div
                      className="flex h-8 items-center justify-between rounded-lg px-3 text-xs font-bold text-white"
                      style={{ width: `${Math.max((s.count / maxStatus) * 100, 8)}%`, background: s.color, transition: "width 0.5s" }}
                    >
                      <span>{s.count}</span>
                      <span>{totalLeads ? ((s.count / totalLeads) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* TODAY'S FOLLOW-UPS */}
        <Card>
          <CardHeader icon={<CalendarCheck className="h-4 w-4" />} title="Today's Follow-ups" link="/sales/leads" />
          <div className="space-y-2">
            {todayFollowUps.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">All clear for today 🎉</p>}
            {todayFollowUps.slice(0, 6).map((l) => {
              const av = avatarFor(l.full_name);
              return (
                <Link key={l.id} to="/sales/leads/$id" params={{ id: l.id }} className="flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-muted">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white", av.color)}>{av.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{new Date(l.follow_up_date!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                  <a href={`tel:${l.phone}`} onClick={(e) => e.stopPropagation()} className="rounded-md bg-emerald-500 p-1.5 text-white"><Phone className="h-3 w-3" /></a>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* HOT LEADS */}
        <Card>
          <CardHeader icon={<Flame className="h-4 w-4" />} title="Hot Leads" link="/sales/leads" />
          <div className="space-y-2">
            {hotLeads.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hot leads right now</p>}
            {hotLeads.map((l) => {
              const av = avatarFor(l.full_name);
              const meta = STATUS_META[l.status];
              return (
                <Link key={l.id} to="/sales/leads/$id" params={{ id: l.id }} className="flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-muted">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white", av.color)}>{av.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.full_name}</div>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", meta?.bg, meta?.text)}>{meta?.label}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* TOP PERFORMERS — admin only */}
        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader icon={<Trophy className="h-4 w-4" />} title={`Top Performers — ${rangeLabel}`} link="/sales/reports" />
            <div className="grid gap-2 md:grid-cols-3">
              {topPerformers.length === 0 && <p className="col-span-3 py-6 text-center text-sm text-muted-foreground">No sales this month yet</p>}
              {topPerformers.map((p, i) => {
                const av = avatarFor(p.rep.full_name);
                const medal = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"][i];
                return (
                  <div key={p.rep.id} className="relative overflow-hidden rounded-xl border border-border p-3">
                    <div className={`absolute right-0 top-0 rounded-bl-xl bg-gradient-to-br ${medal} px-2 py-1 text-[10px] font-extrabold text-white`}>#{i + 1}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {p.rep.avatar_url ? <img src={p.rep.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <span className={cn("flex h-full w-full items-center justify-center text-xs font-bold text-white", av.color)}>{av.initials}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{p.rep.full_name}</div>
                        <div className="text-xs text-muted-foreground">{p.sales} deals</div>
                      </div>
                    </div>
                    <div className="mt-2 text-lg font-extrabold text-emerald-700">{formatMoney(p.revenue)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* MY SALES — executive only */}
        {!isAdmin && (() => {
          const myWonAll = allMyLeads.filter((l) => isWon(l.status));
          const myWonRange = monthWon;
          const myRangeRevenue = monthRevenue;
          const myAllRevenue = myWonAll.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
          const avgDeal = myWonRange.length ? myRangeRevenue / myWonRange.length : 0;
          const recent = [...myWonAll].sort((a, b) => new Date(b.won_at ?? 0).getTime() - new Date(a.won_at ?? 0).getTime()).slice(0, 5);
          return (
            <Card className="lg:col-span-2">
              <CardHeader icon={<Trophy className="h-4 w-4" />} title={`My Sales — ${rangeLabel}`} />
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white shadow-lg">
                  <div className="text-[11px] font-semibold opacity-90">Sales ({rangeLabel})</div>
                  <div className="mt-1 text-lg font-extrabold">{formatMoney(myRangeRevenue)}</div>
                  <div className="text-[11px] opacity-90">{myWonRange.length} deals</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-3 text-white shadow-lg">
                  <div className="text-[11px] font-semibold opacity-90">Avg Deal Size</div>
                  <div className="mt-1 text-lg font-extrabold">{formatMoney(avgDeal)}</div>
                  <div className="text-[11px] opacity-90">per won deal</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white shadow-lg">
                  <div className="text-[11px] font-semibold opacity-90">All-Time Sales</div>
                  <div className="mt-1 text-lg font-extrabold">{formatMoney(myAllRevenue)}</div>
                  <div className="text-[11px] opacity-90">{myWonAll.length} deals</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-2 text-xs font-bold text-muted-foreground">Recent Won Deals</div>
                {recent.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No won deals yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {recent.map((l) => (
                      <Link key={l.id} to="/sales/leads/$id" params={{ id: l.id }} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{l.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{l.won_at ? new Date(l.won_at).toLocaleDateString() : "—"}</div>
                        </div>
                        <div className="text-sm font-extrabold text-emerald-700">{formatMoney(Number(l.deal_value ?? 0))}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* RECENT ACTIVITY */}
        <Card className={isAdmin ? "" : "lg:col-span-2"}>
          <CardHeader icon={<Activity className="h-4 w-4" />} title={isAdmin ? "Recent Team Activity" : "My Recent Activity"} />
          <div className="space-y-2">
            {(() => {
              const myLeadIds = new Set(allMyLeads.map((l) => l.id));
              const filtered = isAdmin ? activities : activities.filter((a) => myLeadIds.has(a.lead_id));
              if (filtered.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>;
              return filtered.slice(0, 6).map((a) => {
                const Icon = a.type.includes("call") ? Phone : a.type.includes("whatsapp") ? MessageCircle : a.type.includes("email") ? Mail : Activity;
                return (
                  <Link key={a.id} to="/sales/leads/$id" params={{ id: a.lead_id }} className="flex items-start gap-2 rounded-lg border border-border p-2 hover:bg-muted">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{a.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{a.lead?.full_name ?? "—"}</span>
                        <span>·</span>
                        <Clock className="h-3 w-3" /> {relativeTime(a.created_at)}
                      </div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>;
}
function CardHeader({ icon, title, link }: { icon: React.ReactNode; title: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-bold">{icon}{title}</h3>
      {link && <Link to={link} className="text-xs font-semibold text-primary hover:underline">View all →</Link>}
    </div>
  );
}
function StatPill({ icon: Icon, label, value, gradient, link }: { icon: typeof Users; label: string; value: number; gradient: string; link: string }) {
  return (
    <Link
      to={link}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg transition hover:shadow-xl",
        gradient,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-extrabold leading-none">{value}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/85">{label}</div>
        </div>
      </div>
    </Link>
  );
}
function TargetBar({ label, achieved, target }: { label: string; achieved: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const bar = pct >= 100 ? "from-emerald-500 to-teal-500"
    : pct >= 70 ? "from-blue-500 to-indigo-500"
    : pct >= 40 ? "from-amber-400 to-orange-500"
    : "from-rose-400 to-red-500";
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full bg-gradient-to-r", bar)} style={{ width: `${pct}%`, transition: "width 0.5s" }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-emerald-600">{formatMoney(achieved)}</span>
        <span className="text-muted-foreground">of {target > 0 ? formatMoney(target) : "—"}</span>
      </div>
      {target > 0 && achieved < target && (
        <div className="mt-1 text-[11px] text-muted-foreground">{formatMoney(target - achieved)} to go</div>
      )}
    </div>
  );
}
