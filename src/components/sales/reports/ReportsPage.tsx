import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  ShieldCheck,
  Activity as ActivityIcon,
  PieChart as PieIcon,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Loader2,
  Search,
  Target,
  AlertTriangle,
  Flame,
  Wallet,
  Receipt,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCourseMeta,
  avatarFor,
  formatMoney,
  type LeadStatus,
  type LeadCourse,
} from "@/lib/leads";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { useSalesSources } from "@/contexts/SalesSourcesContext";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { useExpenseCategories } from "@/contexts/SalesExpenseCategoriesContext";

type RangeKey = "7" | "30" | "90" | "custom";
type TabKey = "overview" | "profit" | "reps" | "sources" | "courses" | "districts" | "compliance" | "activity";

interface LeadRow {
  id: string;
  status: LeadStatus;
  source: string;
  courses: LeadCourse[];
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  deal_value?: number | null;
  won_at?: string | null;
  district?: string | null;
}
interface SalesUserRow {
  id: string;
  full_name: string;
  role: "admin" | "executive";
  avatar_url?: string | null;
}
interface ExpenseSlim {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
}
interface FollowUpRow {
  id: string;
  assigned_to: string | null;
  scheduled_at: string;
  status: "pending" | "completed" | "missed" | "snoozed" | "cancelled";
  completed_at: string | null;
}
interface ActivityRow {
  id: string;
  lead_id: string;
  type: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  lead: { full_name: string } | null;
  rep: { full_name: string } | null;
}

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "profit", label: "Profit & Loss", icon: Wallet },
  { key: "reps", label: "Rep Performance", icon: Users },
  { key: "sources", label: "Lead Sources", icon: PieIcon },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "districts", label: "Districts", icon: MapPin },
  { key: "compliance", label: "Follow-up Compliance", icon: CalendarCheck },
  { key: "activity", label: "Activity Log", icon: ActivityIcon },
];

export default function ReportsPage() {
  const [range, setRange] = useState<RangeKey>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // tabs removed — single-scroll layout
  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [wonLeads, setWonLeads] = useState<LeadRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseSlim[]>([]);
  const [users, setUsers] = useState<SalesUserRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const { fromDate, toDate } = useMemo(() => {
    const t = new Date();
    t.setHours(23, 59, 59, 999);
    if (range === "custom") {
      return {
        fromDate: from ? new Date(from + "T00:00:00") : new Date(0),
        toDate: to ? new Date(to + "T23:59:59") : t,
      };
    }
    const days = parseInt(range, 10);
    const f = new Date();
    f.setDate(f.getDate() - days + 1);
    f.setHours(0, 0, 0, 0);
    return { fromDate: f, toDate: t };
  }, [range, from, to]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const fromISO = fromDate.toISOString();
      const toISO = toDate.toISOString();
      const fromDay = fromDate.toISOString().slice(0, 10);
      const toDay = toDate.toISOString().slice(0, 10);
      const [l, w, ex, u, fu, ac] = await Promise.all([
        supabase
          .from("leads")
          .select("id, status, source, courses, assigned_to, created_at, updated_at, deal_value, won_at, district")
          .gte("created_at", fromISO)
          .lte("created_at", toISO),
        // Won leads keyed by won_at — drives revenue/profit regardless of when the lead was created.
        supabase
          .from("leads")
          .select("id, status, source, courses, assigned_to, created_at, updated_at, deal_value, won_at, district")
          .not("won_at", "is", null)
          .gte("won_at", fromISO)
          .lte("won_at", toISO),
        supabase
          .from("expenses")
          .select("id, category, amount, expense_date")
          .gte("expense_date", fromDay)
          .lte("expense_date", toDay),
        supabase.from("sales_users").select("id, full_name, role, avatar_url"),
        supabase
          .from("follow_ups")
          .select("id, assigned_to, scheduled_at, status, completed_at")
          .gte("scheduled_at", fromISO)
          .lte("scheduled_at", toISO),
        supabase
          .from("lead_activities")
          .select(
            "id, lead_id, type, title, description, created_by, created_at, lead:leads(full_name), rep:sales_users!lead_activities_created_by_fkey(full_name)",
          )
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      if (cancel) return;
      if (l.error) toast.error(l.error.message);
      setLeads((l.data ?? []) as LeadRow[]);
      setWonLeads((w.data ?? []) as LeadRow[]);
      setExpenses((ex.data ?? []) as ExpenseSlim[]);
      setUsers((u.data ?? []) as SalesUserRow[]);
      setFollowUps((fu.data ?? []) as FollowUpRow[]);
      setActivities((ac.data ?? []) as unknown as ActivityRow[]);
      setLoading(false);
    };
    load();
    return () => {
      cancel = true;
    };
  }, [fromDate, toDate]);

  const exportAll = (kind: "pdf" | "xlsx") => {
    const sections: { key: TabKey; label: string }[] = TABS.map((t) => ({ key: t.key, label: t.label }));
    if (kind === "pdf") {
      const doc = new jsPDF({ orientation: "landscape" });
      let first = true;
      for (const s of sections) {
        const el = document.getElementById(`report-table-${s.key}`) as HTMLTableElement | null;
        if (!el) continue;
        if (!first) doc.addPage();
        first = false;
        doc.setFontSize(14);
        doc.text(`Reports — ${s.label}`, 14, 14);
        autoTable(doc, { html: el, startY: 20, styles: { fontSize: 9 } });
      }
      if (first) {
        toast.message("No data to export");
        return;
      }
      doc.save(`reports-all.pdf`);
    } else {
      const wb = XLSX.utils.book_new();
      let added = 0;
      for (const s of sections) {
        const el = document.getElementById(`report-table-${s.key}`) as HTMLTableElement | null;
        if (!el) continue;
        const ws = XLSX.utils.table_to_sheet(el);
        XLSX.utils.book_append_sheet(wb, ws, s.label.slice(0, 28));
        added++;
      }
      if (!added) {
        toast.message("No data to export");
        return;
      }
      XLSX.writeFile(wb, `reports-all.xlsx`);
    }
  };

  // ================= HERO KPIs =================
  const heroRevenue = wonLeads.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
  const heroExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const heroProfit = heroRevenue - heroExpenses;
  const heroWon = wonLeads.length;
  const heroLeads = leads.length;
  const heroConv = heroLeads ? (heroWon / heroLeads) * 100 : 0;

  const HERO: { label: string; value: string; sub: string; gradient: string; icon: typeof Wallet }[] = [
    { label: "Revenue", value: formatMoney(heroRevenue), sub: `${heroWon} converted deals`, gradient: "from-emerald-500 via-teal-500 to-cyan-500", icon: TrendingUp },
    { label: "Profit", value: formatMoney(heroProfit), sub: heroProfit >= 0 ? "in the green" : "in the red", gradient: heroProfit >= 0 ? "from-blue-600 via-indigo-600 to-violet-600" : "from-rose-500 via-red-500 to-orange-500", icon: Wallet },
    { label: "Expenses", value: formatMoney(heroExpenses), sub: `${expenses.length} entries`, gradient: "from-rose-500 via-pink-500 to-fuchsia-500", icon: Receipt },
    { label: "Conversion", value: `${heroConv.toFixed(1)}%`, sub: `${heroLeads} total leads`, gradient: "from-amber-500 via-orange-500 to-red-500", icon: Target },
  ];

  const SECTIONS: { key: TabKey; label: string; icon: typeof BarChart3; accent: string }[] = [
    { key: "overview", label: "Overview", icon: BarChart3, accent: "from-blue-500 to-indigo-500" },
    { key: "profit", label: "Profit & Loss", icon: Wallet, accent: "from-emerald-500 to-teal-500" },
    { key: "reps", label: "Rep Performance", icon: Users, accent: "from-violet-500 to-purple-500" },
    { key: "sources", label: "Lead Sources", icon: PieIcon, accent: "from-pink-500 to-rose-500" },
    { key: "courses", label: "Courses", icon: BookOpen, accent: "from-amber-500 to-orange-500" },
    { key: "districts", label: "Districts", icon: MapPin, accent: "from-fuchsia-500 to-pink-500" },
    { key: "compliance", label: "Follow-up Compliance", icon: CalendarCheck, accent: "from-cyan-500 to-blue-500" },
    { key: "activity", label: "Activity Log", icon: ActivityIcon, accent: "from-slate-500 to-slate-700" },
  ];

  const scrollToSection = (key: TabKey) => {
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">All your sales metrics in one scrollable view</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["7", "30", "90", "custom"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                range === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {r === "custom" ? "Custom" : `Last ${r} days`}
            </button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs" />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs" />
            </div>
          )}
          <button onClick={() => exportAll("pdf")} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => exportAll("xlsx")} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* HERO KPI STRIP */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HERO.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.gradient} p-5 text-white shadow-lg`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/85">{k.label}</div>
                  <div className="mt-2 text-3xl font-extrabold">{k.value}</div>
                  <div className="mt-0.5 text-xs text-white/80">{k.sub}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* QUICK NAV */}
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap gap-2 rounded-xl bg-background/80 px-2 py-2 backdrop-blur">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => scrollToSection(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${s.accent} px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95`}
            >
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.section
                key={s.key}
                id={`section-${s.key}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.2) }}
                className="scroll-mt-20 space-y-4"
              >
                <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-r ${s.accent} p-4 text-white shadow-md`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">{s.label}</h2>
                    <p className="text-xs text-white/85">Section {idx + 1} of {SECTIONS.length}</p>
                  </div>
                </div>
                {s.key === "overview" && <OverviewTab leads={leads} />}
                {s.key === "profit" && <ProfitTab wonLeads={wonLeads} expenses={expenses} users={users} />}
                {s.key === "reps" && <RepsTab leads={leads} users={users} followUps={followUps} wonLeads={wonLeads} />}
                {s.key === "sources" && <SourcesTab leads={leads} />}
                {s.key === "courses" && <CoursesTab leads={leads} />}
                {s.key === "districts" && <DistrictsTab leads={leads} />}
                {s.key === "compliance" && <ComplianceTab users={users} followUps={followUps} />}
                {s.key === "activity" && <ActivityTab activities={activities} users={users} />}
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= OVERVIEW ================= */
function OverviewTab({ leads }: { leads: LeadRow[] }) {
  const total = leads.length;
  const byStatus = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
  const newC = byStatus("intake");
  const contacted = leads.filter((l) => l.status !== "intake").length;
  const qualified = leads.filter((l) => ["ready_for_class", "convert"].includes(l.status)).length;
  const won = byStatus("convert");
  const lost = byStatus("lost");
  const conv = total ? (won / total) * 100 : 0;

  const kpis = [
    { label: "Total Leads", value: total, color: "bg-blue-100 text-blue-700" },
    { label: "New", value: newC, color: "bg-indigo-100 text-indigo-700" },
    { label: "Contacted", value: contacted, color: "bg-violet-100 text-violet-700" },
    { label: "Qualified", value: qualified, color: "bg-purple-100 text-purple-700" },
    { label: "Converted", value: won, color: "bg-emerald-100 text-emerald-700" },
    { label: "Conversion", value: `${conv.toFixed(1)}%`, color: "bg-amber-100 text-amber-700" },
  ];

  const funnel = [
    { label: "New", count: total, color: "#3B82F6", pct: 100 },
    { label: "Contacted", count: contacted, color: "#6366F1", pct: total ? (contacted / total) * 100 : 0 },
    { label: "Qualified", count: qualified, color: "#A855F7", pct: total ? (qualified / total) * 100 : 0 },
    { label: "Converted", count: won, color: "#10B981", pct: total ? (won / total) * 100 : 0 },
  ];

  // 8 buckets across the range
  const buckets = useMemo(() => {
    const sorted = [...leads].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (sorted.length === 0) return [];
    const start = new Date(sorted[0].created_at).getTime();
    const end = new Date(sorted[sorted.length - 1].created_at).getTime();
    const span = Math.max(end - start, 1);
    const out: { name: string; conv: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const s = start + (span * i) / 8;
      const e = start + (span * (i + 1)) / 8;
      const inRange = sorted.filter(
        (l) => new Date(l.created_at).getTime() >= s && new Date(l.created_at).getTime() < e,
      );
      const w = inRange.filter((l) => l.status === "convert").length;
      out.push({
        name: new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        conv: inRange.length ? +((w / inRange.length) * 100).toFixed(1) : 0,
      });
    }
    return out;
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${k.color}`}>
              <Trophy className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-extrabold">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">Conversion Funnel</h3>
        <div className="mt-4 space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-24 text-xs font-semibold">{f.label}</div>
              <div className="flex-1">
                <div
                  className="flex h-9 items-center justify-between rounded-lg px-3 text-xs font-bold text-white shadow-sm"
                  style={{
                    background: f.color,
                    width: `${Math.max(f.pct, 6)}%`,
                    transition: "width 0.4s",
                  }}
                >
                  <span>{f.count}</span>
                  <span>{f.pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <table id="report-table-overview" className="hidden">
          <thead>
            <tr><th>Stage</th><th>Count</th><th>Percent</th></tr>
          </thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.label}><td>{f.label}</td><td>{f.count}</td><td>{f.pct.toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">Conversion Trend</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <LineChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="conv" stroke="#1E40AF" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ================= REPS ================= */
function RepsTab({
  leads,
  users,
  followUps,
  wonLeads,
}: {
  leads: LeadRow[];
  users: SalesUserRow[];
  followUps: FollowUpRow[];
  wonLeads: LeadRow[];
}) {
  const { active: activeStatuses } = useSalesStatuses();

  // "This month" window (current calendar month)
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);
  const monthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  }, []);
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const reps = users.filter((u) => u.role === "executive");
  const rows = reps.map((rep) => {
    const myLeads = leads.filter((l) => l.assigned_to === rep.id);
    const assigned = myLeads.length;
    const wonCount = myLeads.filter((l) => activeStatuses.find((s) => s.key === l.status)?.is_won).length;
    const conv = assigned ? (wonCount / assigned) * 100 : 0;

    // Per-status counts (only currently active statuses)
    const statusCounts: Record<string, number> = {};
    for (const s of activeStatuses) statusCounts[s.key] = 0;
    for (const l of myLeads) {
      if (statusCounts[l.status] !== undefined) statusCounts[l.status] += 1;
    }

    const myFu = followUps.filter((f) => f.assigned_to === rep.id);
    const missed = myFu.filter((f) => f.status === "missed").length;
    const total = myFu.length;
    const compliance =
      total === 0 ? 100 : ((total - missed) / total) * 100;

    // This month — based on won_at (uses wonLeads which is filtered by date range too)
    const monthSales = wonLeads.filter((l) => {
      if (l.assigned_to !== rep.id || !l.won_at) return false;
      const t = new Date(l.won_at).getTime();
      return t >= monthStart && t < monthEnd;
    });
    const monthSalesCount = monthSales.length;
    const monthRevenue = monthSales.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
    const monthCourses = monthSales.reduce((s, l) => s + (l.courses?.length ?? 0), 0);

    return { rep, assigned, wonCount, conv, statusCounts, missed, compliance, monthSalesCount, monthRevenue, monthCourses };
  });

  const chartData = rows.map((r) => ({
    name: r.rep.full_name.split(" ")[0],
    Assigned: r.assigned,
    Converted: r.wonCount,
  }));

  const monthTotals = rows.reduce(
    (acc, r) => {
      acc.sales += r.monthSalesCount;
      acc.courses += r.monthCourses;
      acc.revenue += r.monthRevenue;
      return acc;
    },
    { sales: 0, courses: 0, revenue: 0 },
  );

  // Top performers — sorted by month revenue, then sales count
  const topPerformers = rows
    .slice()
    .sort((a, b) => b.monthRevenue - a.monthRevenue || b.monthSalesCount - a.monthSalesCount)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* This-month hero strip */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
          <div className="text-xs font-semibold uppercase text-emerald-700">{monthLabel} — Sales</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-800">{monthTotals.sales}</div>
          <div className="text-xs text-muted-foreground">deals closed</div>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
          <div className="text-xs font-semibold uppercase text-indigo-700">{monthLabel} — Courses</div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-800">{monthTotals.courses}</div>
          <div className="text-xs text-muted-foreground">total courses sold</div>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-orange-50 p-4">
          <div className="text-xs font-semibold uppercase text-amber-700">{monthLabel} — Revenue</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-800">{formatMoney(monthTotals.revenue)}</div>
          <div className="text-xs text-muted-foreground">across all reps</div>
        </div>
      </div>

      {/* Top Performers — with photos */}
      {topPerformers.length > 0 && (
        <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Performers — {monthLabel}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {topPerformers.map((r, i) => {
              const av = avatarFor(r.rep.full_name);
              const medal = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"][i];
              return (
                <div key={r.rep.id} className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className={`absolute right-0 top-0 rounded-bl-xl bg-gradient-to-br ${medal} px-2 py-1 text-[10px] font-extrabold text-white`}>
                    #{i + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full p-[2px]"
                      style={{ background: "conic-gradient(from 140deg, #f472b6, #818cf8, #38bdf8, #f472b6)" }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-card">
                        {r.rep.avatar_url ? (
                          <img src={r.rep.avatar_url} alt={r.rep.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className={`flex h-full w-full items-center justify-center text-sm font-extrabold text-white ${av.color}`}>
                            {av.initials}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{r.rep.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.monthSalesCount} sales · {r.monthCourses} courses</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xl font-extrabold text-emerald-700">{formatMoney(r.monthRevenue)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table id="report-table-reps" className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Rep</th>
              <th className="p-3 text-right" title="Sales (deals) closed this calendar month">{monthLabel} Sales</th>
              <th className="p-3 text-right" title="Total courses across this month's sales">Courses</th>
              <th className="p-3 text-right" title="Revenue from this month's sales">Revenue</th>
              <th className="p-3 text-right">Assigned</th>
              {activeStatuses.map((s) => (
                <th key={s.key} className="p-3 text-right">{s.label}</th>
              ))}
              <th className="p-3 text-right">Conv%</th>
              <th className="p-3 text-right">Missed FU</th>
              <th className="p-3 text-right">Compliance%</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7 + activeStatuses.length} className="p-8 text-center text-muted-foreground">
                  No reps in selected range
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const av = avatarFor(r.rep.full_name);
              return (
                <tr key={r.rep.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {r.rep.avatar_url ? (
                          <img src={r.rep.avatar_url} alt={r.rep.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className={`flex h-full w-full items-center justify-center text-[11px] font-bold text-white ${av.color}`}>
                            {av.initials}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">{r.rep.full_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-700">{r.monthSalesCount}</td>
                  <td className="p-3 text-right font-bold text-indigo-700">{r.monthCourses}</td>
                  <td className="p-3 text-right font-bold text-amber-700">{formatMoney(r.monthRevenue)}</td>
                  <td className="p-3 text-right">{r.assigned}</td>
                  {activeStatuses.map((s) => (
                    <td key={s.key} className="p-3 text-right">{r.statusCounts[s.key] ?? 0}</td>
                  ))}
                  <td className="p-3 text-right">
                    <Pct value={r.conv} />
                  </td>
                  <td className="p-3 text-right">{r.missed}</td>
                  <td className="p-3 text-right">
                    <Pct value={r.compliance} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">Assigned vs Converted</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Assigned" fill="#6366F1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Converted" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Pct({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 80
      ? "bg-emerald-100 text-emerald-700"
      : v >= 50
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{v.toFixed(1)}%</span>;
}

/* ================= SOURCES ================= */
const PIE_COLORS = ["#3B82F6", "#EF4444", "#EC4899", "#10B981", "#8B5CF6", "#0EA5E9", "#94A3B8"];

function SourcesTab({ leads }: { leads: LeadRow[] }) {
  const { active: activeSources } = useSalesSources();
  const sources = activeSources.map((row, i) => {
    const ls = leads.filter((l) => l.source === row.key);
    const won = ls.filter((l) => l.status === "convert").length;
    return {
      source: row.key,
      label: row.name,
      total: ls.length,
      converted: won,
      conv: ls.length ? (won / ls.length) * 100 : 0,
      color: row.color || PIE_COLORS[i % PIE_COLORS.length],
    };
  });
  const pieData = sources.filter((s) => s.total > 0);

  const totalLeads = pieData.reduce((sum, d) => sum + d.total, 0);
  const topSource = pieData.slice().sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60 p-6 shadow-xl shadow-blue-100/40">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-violet-200/30 to-pink-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
              <PieIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Lead Source Breakdown</h3>
              <p className="text-xs text-slate-500">Where your leads are coming from</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-blue-100 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              Total: <span className="text-blue-700">{totalLeads}</span>
            </div>
            {topSource && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
                Top: {topSource.label}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-6 h-80">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="total"
                nameKey="label"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={3}
              >
                {pieData.map((d) => (
                  <Cell key={d.source} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e0e7ff",
                  boxShadow: "0 10px 30px -10px rgba(30,64,175,0.25)",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table id="report-table-sources" className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-right">Leads</th>
              <th className="p-3 text-right">Converted</th>
              <th className="p-3 text-right">Conv%</th>
              <th className="p-3 text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source} className="border-t border-border">
                <td className="p-3 font-semibold">{s.label}</td>
                <td className="p-3 text-right">{s.total}</td>
                <td className="p-3 text-right">{s.converted}</td>
                <td className="p-3 text-right"><Pct value={s.conv} /></td>
                <td className="p-3 text-center">
                  {s.conv >= 20 ? (
                    <TrendingUp className="mx-auto h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="mx-auto h-4 w-4 text-rose-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= COURSES ================= */
function CoursesTab({ leads }: { leads: LeadRow[] }) {
  const { active: activeCourses } = useSalesCourses();
  const courses = activeCourses.map((co) => {
    const ls = leads.filter((l) => l.courses.includes(co.key));
    const qualified = ls.filter((l) => ["ready_for_class", "convert"].includes(l.status)).length;
    const won = ls.filter((l) => l.status === "convert").length;
    return {
      key: co.key,
      label: co.name,
      total: ls.length,
      qualified,
      won,
      conv: ls.length ? (won / ls.length) * 100 : 0,
    };
  });
  const chartData = courses.map((c) => ({ name: c.label, Leads: c.total, Converted: c.won }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">Course Performance</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Leads" fill="#6366F1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Converted" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table id="report-table-courses" className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-right">Total Leads</th>
              <th className="p-3 text-right">Qualified</th>
              <th className="p-3 text-right">Converted</th>
              <th className="p-3 text-right">Conv%</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.key} className="border-t border-border">
                <td className="p-3 font-semibold">{c.label}</td>
                <td className="p-3 text-right">{c.total}</td>
                <td className="p-3 text-right">{c.qualified}</td>
                <td className="p-3 text-right">{c.won}</td>
                <td className="p-3 text-right"><Pct value={c.conv} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= COMPLIANCE ================= */
function ComplianceTab({
  users,
  followUps,
}: {
  users: SalesUserRow[];
  followUps: FollowUpRow[];
}) {
  const reps = users.filter((u) => u.role === "executive");
  const rows = reps.map((rep) => {
    const my = followUps.filter((f) => f.assigned_to === rep.id);
    const onTime = my.filter((f) => f.status === "completed").length;
    const missed = my.filter((f) => f.status === "missed").length;
    const snoozed = my.filter((f) => f.status === "snoozed").length;
    const total = my.length;
    const compliance = total === 0 ? 100 : ((total - missed) / total) * 100;
    return { rep, onTime, missed, snoozed, total, compliance };
  });
  const teamAvg =
    rows.length === 0 ? 0 : rows.reduce((a, b) => a + b.compliance, 0) / rows.length;
  const StatusIcon = teamAvg >= 80 ? Target : teamAvg >= 50 ? AlertTriangle : Flame;
  const statusColor = teamAvg >= 80 ? "text-emerald-500" : teamAvg >= 50 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Team Avg Compliance</div>
            <div className="flex items-center gap-2 text-3xl font-extrabold">
              {teamAvg.toFixed(1)}%
              <StatusIcon className={cn("h-7 w-7", statusColor)} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table id="report-table-compliance" className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Rep</th>
              <th className="p-3 text-right">On-time</th>
              <th className="p-3 text-right">Missed</th>
              <th className="p-3 text-right">Snoozed</th>
              <th className="p-3 text-right">Compliance%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const av = avatarFor(r.rep.full_name);
              return (
                <tr key={r.rep.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ${av.color}`}>
                        {av.initials}
                      </div>
                      <span className="font-semibold">{r.rep.full_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">{r.onTime}</td>
                  <td className="p-3 text-right">{r.missed}</td>
                  <td className="p-3 text-right">{r.snoozed}</td>
                  <td className="p-3 text-right"><Pct value={r.compliance} /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No follow-ups in selected range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= ACTIVITY LOG ================= */
const ACTIVITY_TYPES = [
  "all",
  "call_attempt",
  "call_connected",
  "whatsapp_sent",
  "email_sent",
  "note_added",
  "status_changed",
  "follow_up_scheduled",
  "lead_created",
  "lead_assigned",
] as const;

function ActivityTab({ activities, users }: { activities: ActivityRow[]; users: SalesUserRow[] }) {
  const [q, setQ] = useState("");
  const [repId, setRepId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (repId !== "all" && a.created_by !== repId) return false;
      if (type !== "all" && a.type !== type) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !a.title.toLowerCase().includes(s) &&
          !(a.description ?? "").toLowerCase().includes(s) &&
          !(a.lead?.full_name ?? "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [activities, repId, type, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="w-64 rounded-lg border border-border bg-card pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
        <select
          value={repId}
          onChange={(e) => {
            setRepId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
        >
          <option value="all">All reps</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} results</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table id="report-table-activity" className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Date / Time</th>
              <th className="p-3 text-left">Rep</th>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </td>
                <td className="p-3">{a.rep?.full_name ?? "—"}</td>
                <td className="p-3 font-medium">{a.lead?.full_name ?? "—"}</td>
                <td className="p-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {a.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{a.description ?? a.title}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No activities match filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= PROFIT & LOSS ================= */
type Granularity = "daily" | "weekly" | "monthly";

function ProfitTab({
  wonLeads,
  expenses,
  users,
}: {
  wonLeads: LeadRow[];
  expenses: ExpenseSlim[];
  users: SalesUserRow[];
}) {
  const { active: catRows, getMeta } = useExpenseCategories();
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const totalRevenue = wonLeads.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // By executive
  const byExec = useMemo(() => {
    const m: Record<string, { id: string; name: string; deals: number; revenue: number }> = {};
    for (const u of users) m[u.id] = { id: u.id, name: u.full_name, deals: 0, revenue: 0 };
    for (const l of wonLeads) {
      if (!l.assigned_to) continue;
      const e = m[l.assigned_to];
      if (!e) continue;
      e.deals += 1;
      e.revenue += Number(l.deal_value ?? 0);
    }
    return Object.values(m)
      .filter((x) => x.deals > 0 || x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [wonLeads, users]);

  // Expenses by category
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount ?? 0);
    // include all keys present in data (even if no longer in active list)
    const keys = new Set<string>([...catRows.map((c) => c.key), ...Object.keys(m)]);
    return Array.from(keys).map((key) => {
      const meta = getMeta(key);
      return {
        value: key,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        total: m[key] ?? 0,
      };
    }).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses, catRows, getMeta]);

  // Bucketed revenue vs expense (daily / weekly / monthly)
  const buckets = useMemo(() => {
    const bucketKey = (iso: string): { key: string; label: string } => {
      const d = new Date(iso);
      if (granularity === "monthly") {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { key: k, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
      }
      if (granularity === "weekly") {
        // Monday-based ISO week start
        const day = (d.getDay() + 6) % 7; // 0=Mon
        const monday = new Date(d);
        monday.setDate(d.getDate() - day);
        monday.setHours(0, 0, 0, 0);
        const k = monday.toISOString().slice(0, 10);
        return { key: k, label: `Wk ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` };
      }
      // daily
      const k = d.toISOString().slice(0, 10);
      return { key: k, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    };

    const m: Record<string, { key: string; name: string; revenue: number; expense: number }> = {};
    for (const l of wonLeads) {
      if (!l.won_at) continue;
      const { key, label } = bucketKey(l.won_at);
      m[key] = m[key] ?? { key, name: label, revenue: 0, expense: 0 };
      m[key].revenue += Number(l.deal_value ?? 0);
    }
    for (const e of expenses) {
      const { key, label } = bucketKey(e.expense_date);
      m[key] = m[key] ?? { key, name: label, revenue: 0, expense: 0 };
      m[key].expense += Number(e.amount ?? 0);
    }
    return Object.values(m)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((x) => ({ ...x, profit: x.revenue - x.expense }));
  }, [wonLeads, expenses, granularity]);

  return (
    <div className="space-y-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Revenue"
          value={formatMoney(totalRevenue)}
          sub={`${wonLeads.length} won deals`}
          gradient="from-emerald-500 to-teal-500"
        />
        <KpiCard
          icon={<Receipt className="h-5 w-5" />}
          label="Expenses"
          value={formatMoney(totalExpenses)}
          sub={`${expenses.length} entries`}
          gradient="from-rose-500 to-pink-500"
        />
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label={netProfit >= 0 ? "Net Profit" : "Net Loss"}
          value={formatMoney(Math.abs(netProfit))}
          sub={`${margin.toFixed(1)}% margin`}
          gradient={netProfit >= 0 ? "from-blue-500 to-indigo-500" : "from-amber-500 to-rose-500"}
        />
      </div>

      {/* Granularity-bucketed chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">
            Revenue vs Expenses ({granularity})
          </h3>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition capitalize",
                  granularity === g
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        {buckets.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No revenue or expense data in this range.</p>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By Executive */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Users className="h-4 w-4 text-blue-500" /> Sales by Executive
        </h3>
        {byExec.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No closed sales in this period.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table id="report-table-profit" className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Executive</th>
                  <th className="px-3 py-2 text-right">Deals</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2 text-right">Avg Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byExec.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-semibold">{e.name}</td>
                    <td className="px-3 py-2 text-right">{e.deals}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700">
                      {formatMoney(e.revenue)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {formatMoney(e.deals ? e.revenue / e.deals : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-bold">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">
                    {byExec.reduce((s, x) => s + x.deals, 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {formatMoney(totalRevenue)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Expenses by category */}
      {byCat.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Receipt className="h-4 w-4 text-rose-500" /> Expenses by Category
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCat}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {byCat.map((_, i: number) => (
                      <Cell
                        key={i}
                        fill={["#F43F5E", "#F59E0B", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#6B7280"][i % 7]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {byCat.map((c) => {
                const Icon = c.icon;
                const pct = totalExpenses ? (c.total / totalExpenses) * 100 : 0;
                return (
                  <div key={c.value} className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${c.color}`} />
                    <span className="font-semibold">{c.label}</span>
                    <span className="ml-auto font-bold">{formatMoney(c.total)}</span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div
        className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ================= DISTRICTS ================= */
function DistrictsTab({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"district" | "total" | "won" | "conv">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const map = new Map<string, { district: string; total: number; won: number; revenue: number }>();
    for (const l of leads) {
      const key = (l.district ?? "").trim() || "— Unknown";
      const cur = map.get(key) ?? { district: key, total: 0, won: 0, revenue: 0 };
      cur.total += 1;
      if (l.status === "convert" || l.won_at) {
        cur.won += 1;
        cur.revenue += Number(l.deal_value ?? 0);
      }
      map.set(key, cur);
    }
    let arr = Array.from(map.values()).map((r) => ({
      ...r,
      conv: r.total ? (r.won / r.total) * 100 : 0,
    }));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((r) => r.district.toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [leads, search, sortKey, sortDir]);

  const totalLeads = leads.length;
  const uniqueDistricts = rows.filter((r) => r.district !== "— Unknown").length;
  const unknownCount = rows.find((r) => r.district === "— Unknown")?.total ?? 0;
  const top = rows[0];

  const chartData = rows.slice(0, 12).map((r) => ({
    name: r.district.length > 14 ? r.district.slice(0, 14) + "…" : r.district,
    Leads: r.total,
    Converted: r.won,
  }));

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total Districts" value={String(uniqueDistricts)} icon={<MapPin className="h-5 w-5" />} gradient="from-fuchsia-500 to-pink-500" />
        <KpiCard label="Top District" value={top?.district ?? "—"} sub={top ? `${top.total} leads` : ""} icon={<TrendingUp className="h-5 w-5" />} gradient="from-emerald-500 to-teal-500" />
        <KpiCard label="Total Leads" value={String(totalLeads)} icon={<Users className="h-5 w-5" />} gradient="from-blue-500 to-indigo-500" />
        <KpiCard label="Unknown District" value={String(unknownCount)} sub="Missing district info" icon={<AlertTriangle className="h-5 w-5" />} gradient="from-amber-500 to-orange-500" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">Top Districts (by lead volume)</h3>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Leads" fill="#D946EF" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Converted" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search + Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search district…"
              className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{rows.length}</span> district{rows.length !== 1 ? "s" : ""} shown
          </div>
        </div>
        <div className="overflow-x-auto">
          <table id="report-table-districts" className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="cursor-pointer p-3 text-left hover:text-foreground" onClick={() => toggleSort("district")}>
                  District {sortKey === "district" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="cursor-pointer p-3 text-right hover:text-foreground" onClick={() => toggleSort("total")}>
                  Total Leads {sortKey === "total" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="cursor-pointer p-3 text-right hover:text-foreground" onClick={() => toggleSort("won")}>
                  Converted {sortKey === "won" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="cursor-pointer p-3 text-right hover:text-foreground" onClick={() => toggleSort("conv")}>
                  Conv% {sortKey === "conv" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-left">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    No district data in this date range.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const share = totalLeads ? (r.total / totalLeads) * 100 : 0;
                return (
                  <tr key={r.district} className="border-t border-border">
                    <td className="p-3 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-fuchsia-500" />
                        {r.district}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{r.total}</td>
                    <td className="p-3 text-right text-emerald-700">{r.won}</td>
                    <td className="p-3 text-right"><Pct value={r.conv} /></td>
                    <td className="p-3 text-right">{formatMoney(r.revenue)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
