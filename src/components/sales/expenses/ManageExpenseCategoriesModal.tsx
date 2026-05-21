import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";
import { ExpenseCategories } from "@/lib/sales-api";
import {
  useExpenseCategories,
  EXPENSE_ICON_MAP,
  EXPENSE_ICON_OPTIONS,
  EXPENSE_COLOR_OPTIONS,
  type ExpenseCategoryRow,
} from "@/contexts/SalesExpenseCategoriesContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManageExpenseCategoriesModal({ open, onClose }: Props) {
  const { categories, reload, loading } = useExpenseCategories();
  const [editing, setEditing] = useState<ExpenseCategoryRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setShowForm(false);
    }
  }, [open]);

  const onDelete = async (row: ExpenseCategoryRow) => {
    if (!confirm(`Delete category "${row.label}"? Existing expenses keep this category as a label.`)) return;
    try {
      await ExpenseCategories.remove(row.id);
      toast.success("Category deleted");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggleActive = async (row: ExpenseCategoryRow) => {
    try {
      await ExpenseCategories.update(row.id, { is_active: !row.is_active });
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Expense Categories</DialogTitle>
          <DialogDescription>
            Add custom categories to fit how your business tracks costs.
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <CategoryForm
            initial={editing}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            onSaved={async () => { setShowForm(false); setEditing(null); await reload(); }}
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="mr-1 h-4 w-4" /> New Category
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
              {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : categories.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {categories.map((c) => {
                    const Icon = EXPENSE_ICON_MAP[c.icon] ?? EXPENSE_ICON_MAP.CircleEllipsis;
                    return (
                      <li key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <Icon className={`h-4 w-4 ${c.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{c.label}</div>
                          <div className="text-xs text-muted-foreground">key: {c.key}</div>
                        </div>
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(c)}
                          className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ExpenseCategoryRow | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [key, setKey] = useState(initial?.key ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "CircleEllipsis");
  const [color, setColor] = useState(initial?.color ?? "text-slate-600");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 50);
  const [saving, setSaving] = useState(false);

  const autoKey = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

  const submit = async () => {
    if (!label.trim()) return toast.error("Label is required");
    const finalKey = (key.trim() || autoKey(label)) || "category";
    setSaving(true);
    try {
      const payload = { label: label.trim(), key: finalKey, icon, color, sort_order: sortOrder };
      if (initial) {
        await ExpenseCategories.update(initial.id, payload);
        toast.success("Category updated");
      } else {
        await ExpenseCategories.create(payload);
        toast.success("Category added");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Label *</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Travel" />
        </div>
        <div className="space-y-1.5">
          <Label>Key (optional)</Label>
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={autoKey(label) || "auto"} />
        </div>
        <div className="space-y-1.5">
          <Label>Sort order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {EXPENSE_ICON_OPTIONS.map((name) => {
                const Icon = EXPENSE_ICON_MAP[name];
                return (
                  <SelectItem key={name} value={name}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />{name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_COLOR_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className={`inline-flex items-center gap-2 ${c}`}>
                    <span className="h-3 w-3 rounded-full bg-current" />{c.replace("text-", "")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : initial ? "Update" : "Add"}</Button>
      </DialogFooter>
    </div>
  );
}
