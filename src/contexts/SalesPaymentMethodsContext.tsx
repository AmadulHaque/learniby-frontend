import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { PaymentMethods } from "@/lib/sales-api";

export interface SalesPaymentMethod {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface Ctx {
  methods: SalesPaymentMethod[];
  active: SalesPaymentMethod[];
  loading: boolean;
  reload: () => Promise<void>;
  labelOf: (k: string) => string;
}

const C = createContext<Ctx | null>(null);

export function SalesPaymentMethodsProvider({ children }: { children: ReactNode }) {
  const [methods, setMethods] = useState<SalesPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await PaymentMethods.list();
      setMethods((res.data ?? []) as SalesPaymentMethod[]);
    } catch {
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = methods.filter((m) => m.is_active);
  const labelOf = (k: string) => methods.find((m) => m.key === k)?.label ?? k.replace(/_/g, " ");

  return <C.Provider value={{ methods, active, loading, reload: load, labelOf }}>{children}</C.Provider>;
}

export function useSalesPaymentMethods() {
  const v = useContext(C);
  if (!v) throw new Error("useSalesPaymentMethods must be used inside <SalesPaymentMethodsProvider>");
  return v;
}
