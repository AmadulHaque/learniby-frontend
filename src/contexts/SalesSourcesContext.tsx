import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Facebook, Instagram, Globe, MessageCircle, Users, Search, Sparkles,
  Mail, Phone, Youtube, Linkedin, Twitter, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface SalesSource {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export const SOURCE_ICON_MAP: Record<string, LucideIcon> = {
  Facebook, Instagram, Globe, MessageCircle, Users, Search, Sparkles,
  Mail, Phone, Youtube, Linkedin, Twitter,
};

export interface SourceMeta {
  label: string;
  icon: LucideIcon;
  color: string; // tailwind class e.g. "text-blue-600"
  hex: string;
}

const HEX_TO_TW: Array<[RegExp, string]> = [
  [/^#3B82F6$/i, "text-blue-600"],
  [/^#EF4444$/i, "text-red-500"],
  [/^#EC4899$/i, "text-pink-500"],
  [/^#10B981$/i, "text-emerald-500"],
  [/^#8B5CF6$/i, "text-violet-500"],
  [/^#0EA5E9$/i, "text-sky-500"],
  [/^#F97316$/i, "text-orange-500"],
  [/^#F59E0B$/i, "text-amber-500"],
  [/^#14B8A6$/i, "text-teal-500"],
];
function hexToTwClass(hex: string): string {
  for (const [rx, cls] of HEX_TO_TW) if (rx.test(hex)) return cls;
  return "text-slate-500";
}

interface Ctx {
  sources: SalesSource[];
  active: SalesSource[];
  loading: boolean;
  reload: () => Promise<void>;
  byKey: (key: string) => SalesSource | undefined;
  getMeta: (key: string) => SourceMeta;
}

const C = createContext<Ctx | null>(null);

export function SalesSourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SalesSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("sales_lead_sources").select("*").order("sort_order");
    setSources((data ?? []) as SalesSource[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = sources.filter((s) => s.is_active);
  const byKey = (k: string) => sources.find((s) => s.key === k);
  const getMeta = (key: string): SourceMeta => {
    const row = byKey(key);
    if (row) return {
      label: row.name,
      icon: SOURCE_ICON_MAP[row.icon] ?? Sparkles,
      color: hexToTwClass(row.color),
      hex: row.color,
    };
    return { label: key || "—", icon: Sparkles, color: "text-slate-500", hex: "#94A3B8" };
  };

  return <C.Provider value={{ sources, active, loading, reload: load, byKey, getMeta }}>{children}</C.Provider>;
}

export function useSalesSources() {
  const v = useContext(C);
  if (!v) throw new Error("useSalesSources must be used inside <SalesSourcesProvider>");
  return v;
}
