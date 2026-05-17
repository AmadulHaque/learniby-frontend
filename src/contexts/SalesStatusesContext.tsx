import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { sales } from "@/lib/api";
import type { SalesStatus } from "@/lib/leads";

interface SalesStatusesCtx {
  statuses: SalesStatus[];
  active: SalesStatus[];
  loading: boolean;
  reload: () => Promise<void>;
  isWon: (key: string) => boolean;
  defaultKey: string;
}

const Ctx = createContext<SalesStatusesCtx | null>(null);

export function SalesStatusesProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<SalesStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await sales.taxonomy.statuses.list();
      setStatuses(rows as unknown as SalesStatus[]);
    } catch {
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = statuses.filter((s) => s.is_active);
  const wonKeys = new Set(statuses.filter((s) => s.is_won).map((s) => s.key));
  const defaultKey = statuses.find((s) => s.is_default)?.key ?? statuses[0]?.key ?? "intake";

  return (
    <Ctx.Provider
      value={{
        statuses,
        active,
        loading,
        reload: load,
        isWon: (k) => wonKeys.has(k),
        defaultKey,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSalesStatuses() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSalesStatuses must be used inside <SalesStatusesProvider>");
  return v;
}
