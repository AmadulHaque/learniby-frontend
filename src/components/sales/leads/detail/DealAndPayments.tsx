import { useEffect, useState } from "react";
import { Wallet, Plus, Trash2, Check, X, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Payments, Leads } from "@/lib/sales-api";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { useSalesPaymentMethods } from "@/contexts/SalesPaymentMethodsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, type Lead } from "@/lib/leads";

interface Payment {
  id: string;
  lead_id: string;
  amount: number;
  paid_at: string;
  method: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}



export function DealAndPayments({
  lead,
  onLeadUpdate,
}: {
  lead: Lead;
  onLeadUpdate: (patch: Partial<Lead>) => void;
}) {
  const { courses } = useSalesCourses();
  const { active: activeMethods } = useSalesPaymentMethods();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValue, setEditingValue] = useState(false);
  const [draftValue, setDraftValue] = useState<string>("");

  // New payment form
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await Payments.listForLead(lead.id);
      setPayments((res.data ?? []) as unknown as Payment[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lead.id]);

  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const dealValue = Number(lead.deal_value ?? 0);
  const due = Math.max(0, dealValue - collected);
  const pct = dealValue > 0 ? Math.min(100, Math.round((collected / dealValue) * 100)) : 0;

  // Suggested deal value from selected courses' admission fee (monthly is tracked separately)
  const suggested = lead.courses.reduce((s, k) => {
    const c = courses.find((x) => x.key === k);
    return s + Number(c?.admission_fee ?? c?.default_price ?? 0);
  }, 0);

  const isConverted = !!lead.won_at;
  const monthlyFees = lead.monthly_fees ?? {};
  const [monthlyDraft, setMonthlyDraft] = useState<Record<string, string>>({});
  const [savingMonthly, setSavingMonthly] = useState(false);

  const totalMonthly = lead.courses.reduce((s, k) => {
    const override = monthlyFees[k];
    const courseDefault = courses.find((x) => x.key === k)?.monthly_fee ?? 0;
    return s + Number(override ?? courseDefault);
  }, 0);

  const saveMonthly = async (k: string) => {
    const v = Number(monthlyDraft[k]);
    if (isNaN(v) || v < 0) { toast.error("Invalid monthly fee"); return; }
    setSavingMonthly(true);
    const next = { ...monthlyFees, [k]: v };
    try {
      await Leads.update(lead.id, { monthly_fees: next });
      onLeadUpdate({ monthly_fees: next });
      setMonthlyDraft((p) => { const n = { ...p }; delete n[k]; return n; });
      toast.success("Monthly fee updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingMonthly(false);
    }
  };

  const startEditValue = () => {
    setDraftValue(String(dealValue || suggested || 0));
    setEditingValue(true);
  };
  const saveValue = () => {
    const v = Number(draftValue) || 0;
    onLeadUpdate({ deal_value: v });
    setEditingValue(false);
    toast.success("Deal value updated");
  };
  const useSuggested = () => {
    onLeadUpdate({ deal_value: suggested });
    setEditingValue(false);
    toast.success(`Deal value set to ${formatMoney(suggested)}`);
  };

  const addPayment = async () => {
    const v = Number(amount);
    if (!v || v <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await Payments.create(lead.id, {
        amount: v,
        method,
        paid_at: new Date(paidAt + "T00:00:00").toISOString(),
        note: note || null,
      });
      toast.success("Payment recorded");
      setAmount(""); setNote(""); setMethod("cash"); setAdding(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Payment) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await Payments.remove(p.id);
      toast.success("Payment removed");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          <Wallet className="h-4 w-4" /> Deal & Payments
        </p>
      </div>

      {/* Deal value */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Deal Value</span>
          {!editingValue && (
            <button onClick={startEditValue} className="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
          )}
        </div>
        {editingValue ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-muted-foreground">₹</span>
              <Input
                type="number"
                min={0}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="text-xl font-extrabold"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveValue}><Check className="mr-1 h-3.5 w-3.5" />Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingValue(false)}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
              {suggested > 0 && (
                <Button size="sm" variant="ghost" onClick={useSuggested} className="text-blue-600">
                  <Calculator className="mr-1 h-3.5 w-3.5" />Use {formatMoney(suggested)}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-blue-700">{formatMoney(dealValue)}</p>
            {dealValue === 0 && suggested > 0 && (
              <button onClick={useSuggested} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
                Suggested: {formatMoney(suggested)} — apply
              </button>
            )}
          </>
        )}
      </div>

      {/* Progress */}
      {dealValue > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-emerald-700">Collected</p>
            <p className="text-lg font-extrabold text-emerald-700">{formatMoney(collected)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-amber-700">Due</p>
            <p className="text-lg font-extrabold text-amber-700">{formatMoney(due)}</p>
          </div>
        </div>
      )}
      {dealValue > 0 && (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-right text-[11px] font-semibold text-muted-foreground">{pct}% paid</p>
        </div>
      )}

      {/* Monthly fees — only for converted clients */}
      {isConverted && lead.courses.length > 0 && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-violet-800">Monthly Fee (per course)</p>
            <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">
              Total ₹ {formatMoney(totalMonthly).replace(/^₹\s*/, "")}
            </span>
          </div>
          <p className="mb-3 text-[11px] text-violet-700/80">
            প্রত্যেক জনের জন্য আলাদা amount সেট করতে পারবেন। Default = course-এ সেট করা monthly fee।
          </p>
          <ul className="space-y-2">
            {lead.courses.map((k) => {
              const c = courses.find((x) => x.key === k);
              if (!c) return null;
              const stored = monthlyFees[k];
              const editing = monthlyDraft[k] !== undefined;
              const display = editing
                ? monthlyDraft[k]
                : String(stored ?? c.monthly_fee ?? 0);
              return (
                <li key={k} className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <span className="rounded px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: c.color }}>
                    {c.short_code}
                  </span>
                  <span className="flex-1 min-w-[100px] text-sm font-semibold">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min={0}
                    value={display}
                    onChange={(e) => setMonthlyDraft((p) => ({ ...p, [k]: e.target.value }))}
                    className="h-8 w-24 text-sm font-bold"
                  />
                  {editing && (
                    <Button size="sm" onClick={() => saveMonthly(k)} disabled={savingMonthly} className="h-7 px-2">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!editing && stored == null && (
                    <span className="text-[10px] font-semibold text-muted-foreground">default</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Payments list */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-muted-foreground">Payment History</p>
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add Payment
          </button>
        </div>
        {adding && (
          <div className="mb-3 space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Amount ₹</Label>
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="input w-full">
                {activeMethods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Receipt #, reference, etc." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addPayment} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : payments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No payments yet</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{formatMoney(Number(p.amount))}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {new Date(p.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {p.method.replace("_", " ")}{p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <button onClick={() => remove(p)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
