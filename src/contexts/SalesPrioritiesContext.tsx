import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { sales } from "@/lib/api";
import { STATUS_COLORS } from "@/lib/leads";

export interface SalesPriority {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

export interface PriorityMeta {
  label: string;
  bg: string;
  text: string;
}

interface Ctx {
  priorities: SalesPriority[];
  active: SalesPriority[];
  loading: boolean;
  reload: () => Promise<void>;
  byKey: (k: string) => SalesPriority | undefined;
  getMeta: (k: string) => PriorityMeta;
  defaultKey: string;
}

const C = createContext<Ctx | null>(null);

export function SalesPrioritiesProvider({ children }: { children: ReactNode }) {
  const [priorities, setPriorities] = useState<SalesPriority[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await sales.taxonomy.priorities.list();
      setPriorities(rows as SalesPriority[]);
    } catch {
      setPriorities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = priorities.filter((p) => p.is_active);
  const byKey = (k: string) => priorities.find((p) => p.key === k);
  const getMeta = (k: string): PriorityMeta => {
    const row = byKey(k);
    if (row) {
      const c = STATUS_COLORS[row.color] ?? STATUS_COLORS.slate;
      return { label: row.label, bg: c.bg, text: c.text };
    }
    return { label: k || "—", bg: "bg-slate-100", text: "text-slate-700" };
  };
  const defaultKey = priorities.find((p) => p.is_default)?.key ?? priorities[0]?.key ?? "high";

  return <C.Provider value={{ priorities, active, loading, reload: load, byKey, getMeta, defaultKey }}>{children}</C.Provider>;
}

export function useSalesPriorities() {
  const v = useContext(C);
  if (!v) throw new Error("useSalesPriorities must be used inside <SalesPrioritiesProvider>");
  return v;
}
