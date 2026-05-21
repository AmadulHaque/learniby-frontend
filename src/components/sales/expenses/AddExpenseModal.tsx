import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import {
  useExpenseCategories,
} from "@/contexts/SalesExpenseCategoriesContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ExpenseCategory = string;

export interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  payment_method: string | null;
  paid_to: string | null;
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (row: ExpenseRow) => void;
  editing?: ExpenseRow | null;
}

export function AddExpenseModal({ open, onClose, onSaved, editing }: Props) {
  const { salesUser } = useSalesAuth();
  const { active, getMeta } = useExpenseCategories();
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paidTo, setPaidTo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategory(editing.category);
      setAmount(String(editing.amount));
      setDescription(editing.description ?? "");
      setDate(editing.expense_date);
      setPaymentMethod(editing.payment_method ?? "cash");
      setPaidTo(editing.paid_to ?? "");
    } else {
      setCategory(active[0]?.key ?? "other");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("cash");
      setPaidTo("");
    }
  }, [open, editing, active]);

  const submit = async () => {
    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!category) {
      toast.error("Pick a category");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("expenses")
          .update({
            category,
            amount: n,
            description: description.trim() || null,
            expense_date: date,
            payment_method: paymentMethod || null,
            paid_to: paidTo.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as ExpenseRow);
        toast.success("Expense updated");
      } else {
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            category,
            amount: n,
            description: description.trim() || null,
            expense_date: date,
            payment_method: paymentMethod || null,
            paid_to: paidTo.trim() || null,
            created_by: salesUser?.id ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        onSaved(data as ExpenseRow);
        toast.success("Expense added");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            Track office, ads and other costs to compute net profit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {active.map((c) => {
                  const m = getMeta(c.key);
                  const Icon = m.icon;
                  return (
                    <SelectItem key={c.key} value={c.key}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paid To (Person/Vendor)</Label>
              <Input
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="e.g. Rahim, ABC Vendor"
                list="paid-to-suggestions"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details (vendor, invoice ref, etc.)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
