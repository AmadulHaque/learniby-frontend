import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Building2, Megaphone, Wallet, Zap, Cpu, TrendingUp, CircleEllipsis,
  Receipt, Plane, Car, Coffee, Gift, ShoppingBag, Briefcase, Phone, Mail,
  Sparkles, type LucideIcon,
} from "lucide-react";
import { ExpenseCategories } from "@/lib/sales-api";

export interface ExpenseCategoryRow {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export const EXPENSE_ICON_MAP: Record<string, LucideIcon> = {
  Building2, Megaphone, Wallet, Zap, Cpu, TrendingUp, CircleEllipsis,
  Receipt, Plane, Car, Coffee, Gift, ShoppingBag, Briefcase, Phone, Mail, Sparkles,
};

export const EXPENSE_ICON_OPTIONS = Object.keys(EXPENSE_ICON_MAP);

export const EXPENSE_COLOR_OPTIONS = [
  "text-blue-600", "text-rose-600", "text-emerald-600", "text-amber-600",
  "text-violet-600", "text-pink-600", "text-cyan-600", "text-orange-600",
  "text-teal-600", "text-slate-600",
];

export interface ExpenseCategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface Ctx {
  categories: ExpenseCategoryRow[];
  active: ExpenseCategoryRow[];
  loading: boolean;
  reload: () => Promise<void>;
  byKey: (key: string) => ExpenseCategoryRow | undefined;
  getMeta: (key: string) => ExpenseCategoryMeta;
}

const C = createContext<Ctx | null>(null);

export function SalesExpenseCategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await ExpenseCategories.list();
      setCategories((res.data ?? []) as ExpenseCategoryRow[]);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = categories.filter((c) => c.is_active);
  const byKey = (k: string) => categories.find((c) => c.key === k);
  const getMeta = (key: string): ExpenseCategoryMeta => {
    const row = byKey(key);
    if (row) {
      return {
        key: row.key,
        label: row.label,
        icon: EXPENSE_ICON_MAP[row.icon] ?? CircleEllipsis,
        color: row.color || "text-slate-600",
      };
    }
    return { key, label: key || "—", icon: CircleEllipsis, color: "text-slate-600" };
  };

  return (
    <C.Provider value={{ categories, active, loading, reload: load, byKey, getMeta }}>
      {children}
    </C.Provider>
  );
}

export function useExpenseCategories() {
  const v = useContext(C);
  if (!v) throw new Error("useExpenseCategories must be used inside <SalesExpenseCategoriesProvider>");
  return v;
}
