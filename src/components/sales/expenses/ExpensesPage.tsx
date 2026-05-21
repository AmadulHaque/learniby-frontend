import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  Receipt,
  Pencil,
  Trash2,
  Download,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Expenses } from "@/lib/sales-api";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { formatMoney, monthLabel } from "@/lib/leads";
import { Settings2 } from "lucide-react";
import {
  AddExpenseModal,
  type ExpenseRow,
} from "./AddExpenseModal";
import { ManageExpenseCategoriesModal } from "./ManageExpenseCategoriesModal";
import { useExpenseCategories } from "@/contexts/SalesExpenseCategoriesContext";

export function ExpensesPage() {
  const { salesUser, loading: authLoading } = useSalesAuth();
  const isAdmin = salesUser?.role === "admin";
  const { active: activeCats, getMeta } = useExpenseCategories();

  const today = new Date();
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);

  const monthStart = useMemo(() => new Date(`${month}-01T00:00:00`), [month]);
  const monthEnd = useMemo(() => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [monthStart]);

  useEffect(() => {
    if (!salesUser) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesUser, month]);

  const load = async () => {
    setLoading(true);
    try {
      const from = monthStart.toISOString().slice(0, 10);
      const lastDay = new Date(monthEnd);
      lastDay.setDate(lastDay.getDate() - 1);
      const to = lastDay.toISOString().slice(0, 10);
      const res = await Expenses.list({ from, to, per_page: 500 });
      setRows((res.data ?? []) as unknown as ExpenseRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => (categoryFilter === "all" ? rows : rows.filter((r) => r.category === categoryFilter)),
    [rows, categoryFilter],
  );

  const total = filtered.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const monthTotal = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.category] = (m[r.category] ?? 0) + Number(r.amount ?? 0);
    return activeCats.map((c) => {
      const meta = getMeta(c.key);
      const total = m[c.key] ?? 0;
      return {
        value: c.key,
        label: c.label,
        icon: meta.icon,
        color: meta.color,
        total,
        pct: monthTotal ? (total / monthTotal) * 100 : 0,
      };
    }).filter((c) => c.total > 0);
  }, [rows, monthTotal, activeCats, getMeta]);

  const onDelete = async (row: ExpenseRow) => {
    if (!confirm(`Delete this ${getMeta(row.category).label} expense of ${formatMoney(row.amount)}?`)) return;
    try {
      await Expenses.remove(row.id);
      setRows((all) => all.filter((x) => x.id !== row.id));
      toast.success("Expense deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const exportCsv = () => {
    const out = [
      ["Date", "Category", "Paid To", "Payment Method", "Description", "Amount"],
      ...filtered.map((r) => [
        r.expense_date,
        getMeta(r.category).label,
        r.paid_to ?? "",
        r.payment_method ?? "",
        (r.description ?? "").replace(/\n/g, " "),
        Number(r.amount).toFixed(2),
      ]),
    ];
    const csv = out
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(monthStart)} — track every cost to know your real profit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-40"
          />
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Settings2 className="h-4 w-4" /> Categories
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Tile
          icon={<TrendingDown className="h-5 w-5" />}
          label="Total Expenses"
          value={formatMoney(monthTotal)}
          gradient="from-rose-500 to-pink-500"
        />
        <Tile
          icon={<Receipt className="h-5 w-5" />}
          label="Entries"
          value={String(rows.length)}
          gradient="from-amber-500 to-orange-500"
        />
        <Tile
          icon={<Calendar className="h-5 w-5" />}
          label="Avg / day"
          value={formatMoney(
            rows.length
              ? monthTotal /
                  Math.max(
                    1,
                    Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (24 * 3600 * 1000)),
                  )
              : 0,
          )}
          gradient="from-violet-500 to-purple-500"
        />
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Breakdown by Category</h2>
          <div className="space-y-2.5">
            {byCategory.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.value} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${c.color}`} />
                    <span className="font-semibold">{c.label}</span>
                    <span className="ml-auto font-bold">{formatMoney(c.total)}</span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {c.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.pct}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Receipt className="h-5 w-5 text-rose-500" /> All Expenses
          </h2>
          <div className="flex-1" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-56"
          >
            <option value="all">All Categories</option>
            {activeCats.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No expenses recorded for this period.</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Add your first expense
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Paid To</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const m = getMeta(r.category);
                  const Icon = m.icon;
                  const pmLabel = r.payment_method
                    ? r.payment_method.charAt(0).toUpperCase() + r.payment_method.slice(1)
                    : null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.expense_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                          <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                          {m.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-foreground">
                        {r.paid_to || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {pmLabel ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                            {pmLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3 text-xs text-foreground/80">
                        {r.description || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-rose-600">
                        {formatMoney(r.amount)}
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditing(r);
                              setModalOpen(true);
                            }}
                            className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(r)}
                            className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/30 font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>
                    Total ({filtered.length})
                  </td>
                  <td className="px-4 py-3 text-right text-rose-700">{formatMoney(total)}</td>
                  {isAdmin && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={(row) => {
          setRows((all) => {
            const i = all.findIndex((x) => x.id === row.id);
            if (i >= 0) {
              const copy = [...all];
              copy[i] = row;
              return copy;
            }
            return [row, ...all];
          });
        }}
      />
      <ManageExpenseCategoriesModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div
        className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
