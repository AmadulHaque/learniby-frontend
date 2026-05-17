import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet, Trophy, TrendingUp, Download, Search, ArrowUpRight, Target as TargetIcon, Plus } from "lucide-react";
import { sales } from "@/lib/api";
import { unwrapList } from "@/lib/api/sales";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { formatMoney, monthLabel } from "@/lib/leads";
import { AddExpenseModal } from "@/components/sales/expenses/AddExpenseModal";
import { toast } from "sonner";

export const Route = createFileRoute("/sales/accounting")({
  component: AccountingPage,
});

interface WonLead {
  id: string;
  full_name: string;
  phone: string;
  courses: string[];
  status: string;
  deal_value: number | null;
  won_at: string | null;
  assigned_to: string | null;
  created_at: string;
}
interface Payment {
  id: string;
  lead_id: string;
  amount: number;
  paid_at: string;
  method: string;
}
interface Rep { id: string; full_name: string; role: string; }

function AccountingPage() {
  const { salesUser, loading: authLoading } = useSalesAuth();
  const isAdmin = salesUser?.role === "admin";

  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [repFilter, setRepFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const [reps, setReps] = useState<Rep[]>([]);
  const [wonLeads, setWonLeads] = useState<WonLead[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => new Date(`${month}-01T00:00:00`), [month]);
  const monthEnd = useMemo(() => { const d = new Date(monthStart); d.setMonth(d.getMonth() + 1); return d; }, [monthStart]);

  useEffect(() => {
    if (!salesUser) return;
    (async () => {
      setLoading(true);
      try {
        const monthDate = `${month}-01`;
        const [r, won, t] = await Promise.all([
          isAdmin
            ? sales.salesUsers.list()
            : Promise.resolve([{ id: salesUser.id, full_name: salesUser.full_name, role: salesUser.role } as Rep]),
          sales.leads.listAll({ won_from: monthStart.toISOString(), won_to: monthEnd.toISOString() }),
          sales.targets.list({ month: monthDate }),
        ]);
        const wonList = won as unknown as WonLead[];
        const ids = wonList.map((w) => w.id);
        let pays: Payment[] = [];
        if (ids.length) {
          const pd = await sales.payments.list({ lead_ids: ids, per_page: 1000 });
          pays = unwrapList(pd) as unknown as Payment[];
        }
        setReps(r as unknown as Rep[]);
        setWonLeads(wonList);
        setPayments(pays);
        const tmap: Record<string, number> = {};
        for (const row of t as unknown as { sales_user_id: string; target_amount: number }[]) {
          tmap[row.sales_user_id] = Number(row.target_amount);
        }
        setTargets(tmap);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [salesUser, isAdmin, month, monthStart, monthEnd]);

  const filtered = useMemo(() => {
    return wonLeads.filter((l) => {
      if (repFilter !== "all" && l.assigned_to !== repFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!l.full_name.toLowerCase().includes(s) && !l.phone.includes(s)) return false;
      }
      return true;
    });
  }, [wonLeads, repFilter, search]);

  const collectedByLead = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) m[p.lead_id] = (m[p.lead_id] ?? 0) + Number(p.amount);
    return m;
  }, [payments]);

  // Totals
  const totalDeals = filtered.length;
  const totalRevenue = filtered.reduce((s, l) => s + Number(l.deal_value ?? 0), 0);
  const totalCollected = filtered.reduce((s, l) => s + (collectedByLead[l.id] ?? 0), 0);
  const totalDue = Math.max(0, totalRevenue - totalCollected);

  // Leaderboard data
  const leaderboard = useMemo(() => {
    const map: Record<string, { id: string; name: string; role: string; deals: number; revenue: number; collected: number; target: number }> = {};
    for (const r of reps) map[r.id] = { id: r.id, name: r.full_name, role: r.role, deals: 0, revenue: 0, collected: 0, target: targets[r.id] ?? 0 };
    for (const l of wonLeads) {
      if (!l.assigned_to || !map[l.assigned_to]) continue;
      map[l.assigned_to].deals += 1;
      map[l.assigned_to].revenue += Number(l.deal_value ?? 0);
      map[l.assigned_to].collected += collectedByLead[l.id] ?? 0;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [reps, wonLeads, collectedByLead, targets]);

  const exportCsv = () => {
    const rows = [
      ["Won Date", "Lead", "Phone", "Courses", "Deal Value", "Collected", "Due", "Sales Rep"],
      ...filtered.map((l) => {
        const rep = reps.find((r) => r.id === l.assigned_to)?.full_name ?? "—";
        const c = collectedByLead[l.id] ?? 0;
        const dv = Number(l.deal_value ?? 0);
        return [
          l.won_at ? new Date(l.won_at).toLocaleDateString("en-GB") : "",
          l.full_name,
          l.phone,
          l.courses.join("|"),
          dv,
          c,
          Math.max(0, dv - c),
          rep,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales-history-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sales History & Accounting</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(monthStart)} — closed deals, revenue and collections</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-40" />
          {isAdmin && (
            <button onClick={() => setExpenseModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-95">
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          )}
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {isAdmin && (
        <AddExpenseModal
          open={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          onSaved={() => { toast.success("Expense added"); setExpenseModalOpen(false); }}
        />
      )}

      {/* Summary tiles — match dashboard hero gradient style */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={<Trophy className="h-5 w-5" />} label="Won Deals" value={String(totalDeals)} gradient="from-blue-600 via-indigo-600 to-violet-600" />
        <Tile icon={<Wallet className="h-5 w-5" />} label="Total Revenue" value={formatMoney(totalRevenue)} gradient="from-emerald-500 via-teal-500 to-cyan-500" />
        <Tile icon={<TrendingUp className="h-5 w-5" />} label="Collected" value={formatMoney(totalCollected)} gradient="from-violet-600 via-purple-600 to-fuchsia-600" />
        <Tile icon={<TargetIcon className="h-5 w-5" />} label="Due" value={formatMoney(totalDue)} gradient="from-amber-500 via-orange-500 to-rose-500" />
      </div>

      {/* Leaderboard */}
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Trophy className="h-5 w-5 text-amber-500" /> Leaderboard</h2>
            <span className="text-xs text-muted-foreground">{monthLabel(monthStart)}</span>
          </div>
          <div className="space-y-2">
            {leaderboard.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>}
            {leaderboard.map((r, i) => {
              const pct = r.target > 0 ? Math.min(100, Math.round((r.revenue / r.target) * 100)) : 0;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
              return (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-base font-bold">{medal}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.deals} deals · {formatMoney(r.revenue)} revenue · {formatMoney(r.collected)} collected</p>
                    </div>
                    <div className="text-right">
                      {r.target > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground">Target {formatMoney(r.target)}</p>
                          <p className="text-sm font-bold text-emerald-600">{pct}%</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No target set</p>
                      )}
                    </div>
                  </div>
                  {r.target > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Sales History table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Wallet className="h-5 w-5 text-blue-500" /> Sales History</h2>
          <div className="flex-1" />
          {isAdmin && (
            <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="input w-44">
              <option value="all">All Reps</option>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="input w-56 pl-8" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">No closed deals in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Won Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Courses</th>
                  <th className="px-4 py-3 text-right">Deal Value</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  {isAdmin && <th className="px-4 py-3">Sales Rep</th>}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => {
                  const c = collectedByLead[l.id] ?? 0;
                  const dv = Number(l.deal_value ?? 0);
                  const due = Math.max(0, dv - c);
                  const fullyPaid = dv > 0 && c >= dv;
                  const rep = reps.find((r) => r.id === l.assigned_to)?.full_name ?? "—";
                  return (
                    <tr key={l.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {l.won_at ? new Date(l.won_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{l.full_name}</p>
                        <p className="text-xs text-muted-foreground">{l.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{l.courses.join(", ")}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{formatMoney(dv)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatMoney(c)}</td>
                      <td className="px-4 py-3 text-right">
                        {fullyPaid ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Paid</span>
                        ) : (
                          <span className="font-semibold text-amber-700">{formatMoney(due)}</span>
                        )}
                      </td>
                      {isAdmin && <td className="px-4 py-3 text-xs">{rep}</td>}
                      <td className="px-4 py-3">
                        <Link to="/sales/leads/$id" params={{ id: l.id }} className="inline-flex items-center text-blue-600 hover:underline">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/30 font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>Total ({filtered.length})</td>
                  <td className="px-4 py-3 text-right text-blue-700">{formatMoney(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(totalCollected)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{formatMoney(totalDue)}</td>
                  {isAdmin && <td />}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">{label}</div>
          <div className="mt-2 text-2xl font-extrabold">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          {icon}
        </div>
      </div>
    </div>
  );
}
