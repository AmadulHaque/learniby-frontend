import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  AlertTriangle,
  UserPlus,
  Download,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";
import { Notifications } from "@/lib/sales-api";
import { useSalesAuth } from "@/contexts/SalesAuthContext";

type Kind = "follow_up_reminder" | "lead_assigned" | "overdue_follow_up" | "leads_imported" | "status_changed" | "system";

interface Notif {
  id: string;
  kind: Kind;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const META: Record<Kind, { icon: typeof Bell; bg: string; text: string }> = {
  follow_up_reminder: { icon: Clock, bg: "bg-amber-100", text: "text-amber-700" },
  lead_assigned: { icon: UserPlus, bg: "bg-blue-100", text: "text-blue-700" },
  overdue_follow_up: { icon: AlertTriangle, bg: "bg-rose-100", text: "text-rose-700" },
  leads_imported: { icon: Download, bg: "bg-emerald-100", text: "text-emerald-700" },
  status_changed: { icon: RefreshCw, bg: "bg-violet-100", text: "text-violet-700" },
  system: { icon: SettingsIcon, bg: "bg-slate-100", text: "text-slate-600" },
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { authUser } = useSalesAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    let prevTopId: string | null = null;

    const load = async () => {
      try {
        const res = await Notifications.list({ per_page: 50 });
        if (cancelled) return;
        const fresh = (res.data ?? []) as unknown as Notif[];
        if (prevTopId && fresh.length && fresh[0].id !== prevTopId && !fresh[0].is_read) {
          setShake(true);
          setPulse(true);
          setTimeout(() => setShake(false), 600);
          setTimeout(() => setPulse(false), 1200);
        }
        prevTopId = fresh[0]?.id ?? null;
        setItems(fresh);
      } catch {
        // swallow — bell stays empty
      }
    };

    void load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authUser]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    if (!authUser) return;
    if (unread === 0) return;
    setItems((cur) => cur.map((n) => ({ ...n, is_read: true })));
    try {
      await Notifications.markAllRead();
    } catch {
      /* ignore */
    }
  };

  const markRead = async (id: string) => {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await Notifications.markRead(id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        animate={shake ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {unread > 0 ? <BellRing className="h-[18px] w-[18px] text-primary" /> : <Bell className="h-[18px] w-[18px]" />}
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={pulse ? { scale: 1.6 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-[380px] overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-extrabold">Notifications</h3>
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-7 w-7 text-primary" strokeWidth={1.75} />
                  </div>
                  <p className="mt-3 text-sm font-extrabold">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No new notifications.</p>
                </div>
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {items.map((n) => {
                      const M = META[n.kind] ?? META.system;
                      const Icon = M.icon;
                      const inner = (
                        <div className="flex gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${M.bg}`}>
                            <Icon className={`h-4 w-4 ${M.text}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <p className="line-clamp-1 flex-1 text-sm font-bold">{n.title}</p>
                              {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                            </div>
                            {n.body && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground/70">{relTime(n.created_at)}</p>
                          </div>
                        </div>
                      );
                      return (
                        <motion.li
                          key={n.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b border-border last:border-0"
                        >
                          {n.action_url ? (
                            <Link
                              to={n.action_url}
                              onClick={() => {
                                void markRead(n.id);
                                setOpen(false);
                              }}
                              className="block px-4 py-3 hover:bg-muted/60"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <button
                              onClick={() => void markRead(n.id)}
                              className="block w-full px-4 py-3 text-left hover:bg-muted/60"
                            >
                              {inner}
                            </button>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <div className="border-t border-border px-4 py-2 text-center">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckCheck className="h-3 w-3" /> Auto-refreshes every 30s
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
