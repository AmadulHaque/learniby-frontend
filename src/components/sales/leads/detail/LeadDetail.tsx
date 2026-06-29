import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Baby,
  BookOpen,
  Calendar,
  CalendarPlus,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Edit,
  Info,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
  Power,
  PowerOff,
  RefreshCw,
  Smartphone,
  Sparkles,
  StickyNote,
  Trash2,
  User,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { DealAndPayments } from "./DealAndPayments";
import { StatusChangeDialog, platformLabel } from "./StatusChangeDialog";
import {
  Leads,
  Activities,
  Notes,
  SalesUsers,
  type LeadWritePayload,
} from "@/lib/sales-api";
import {
  BUDGET_OPTIONS,
  getCourseMeta,
  getStatusMeta,
  avatarFor,
  formatPhone,
  relativeTime,
  type ActivityType,
  type FollowUpType,
  type Lead,
  type LeadActivity,
  type LeadNote,
  type NoteAttachment,
  type LeadStatus,
} from "@/lib/leads";
import { useSalesSources } from "@/contexts/SalesSourcesContext";
import { useSalesPriorities } from "@/contexts/SalesPrioritiesContext";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { WhatsAppDialog } from "@/components/sales/leads/WhatsAppDialog";
import { AddLeadModal } from "@/components/sales/leads/AddLeadModal";
import { hasPermission } from "@/lib/sales-permissions";
import { cn } from "@/lib/utils";

const ACTIVITY_META: Record<
  ActivityType,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  call_attempt: { label: "Call Attempt", bg: "bg-orange-500", text: "text-white", icon: Phone },
  call_connected: { label: "Call Connected", bg: "bg-emerald-500", text: "text-white", icon: Check },
  whatsapp_sent: { label: "WhatsApp Sent", bg: "bg-teal-500", text: "text-white", icon: MessageCircle },
  email_sent: { label: "Email Sent", bg: "bg-blue-500", text: "text-white", icon: Mail },
  note_added: { label: "Note Added", bg: "bg-slate-500", text: "text-white", icon: StickyNote },
  status_changed: { label: "Status Changed", bg: "bg-purple-500", text: "text-white", icon: RefreshCw },
  follow_up_scheduled: { label: "Follow-up Scheduled", bg: "bg-amber-500", text: "text-white", icon: Calendar },
  lead_created: { label: "Lead Created", bg: "bg-slate-400", text: "text-white", icon: Sparkles },
  lead_assigned: { label: "Lead Assigned", bg: "bg-indigo-500", text: "text-white", icon: UserPlus },
};

const FALLBACK_ACTIVITY_META = {
  label: "Activity",
  bg: "bg-slate-500",
  text: "text-white",
  icon: Activity,
} satisfies { label: string; bg: string; text: string; icon: LucideIcon };

function getActivityMeta(type: string) {
  return ACTIVITY_META[type as ActivityType] ?? FALLBACK_ACTIVITY_META;
}

// PIPELINE is now derived from the dynamic sales_statuses table at runtime.

interface Props {
  leadId: string;
}

export function LeadDetail({ leadId }: Props) {
  const { salesUser } = useSalesAuth();
  const navigate = useNavigate();
  const isAdmin = salesUser?.role === "admin";
  const { getMeta: priorityGetMeta } = useSalesPriorities();
  const { isWon: isWonStatus, statuses: salesStatuses, active: activeStatuses } = useSalesStatuses();
  // Pipeline = active statuses minus the terminal "lost" bucket (lost shown as separate action).
  const pipelineStatuses = activeStatuses.filter((s) => s.key !== "lost");
  const { byKey: courseByKey } = useSalesCourses();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [reps, setReps] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashActivityId, setFlashActivityId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const requestStatusChange = (next: LeadStatus) => {
    if (!lead || lead.status === next) return;
    setPendingStatus(next);
  };

  // Detect a won/convert transition (built-in `convert`/`won` or any custom status with is_won).
  const pendingIsWon =
    pendingStatus !== null &&
    (pendingStatus === "convert" || pendingStatus === "won" || isWonStatus(pendingStatus));

  // Sum of admission_fee for all courses on this lead — used as the suggested deal value
  // on conversion. Monthly fees are tracked separately per converted client.
  const suggestedDealAmount = (() => {
    if (!lead || !pendingIsWon) return 0;
    let sum = 0;
    for (const k of lead.courses ?? []) {
      const c = courseByKey(k);
      if (c) sum += Number(c.admission_fee ?? c.default_price ?? 0);
    }
    return sum;
  })();

  const confirmStatusChange = async ({
    note,
    platform,
    dealAmount,
    followUpAt,
  }: {
    note: string;
    platform: string;
    dealAmount?: number | null;
    followUpAt?: string | null;
  }) => {
    if (!lead || !pendingStatus) return;
    const fromStatus = lead.status;
    const toStatus = pendingStatus;
    const fromLabel = getStatusMeta(fromStatus, salesStatuses).label;
    const toLabel = getStatusMeta(toStatus, salesStatuses).label;
    const pLabel = platformLabel(platform);
    const movingToWon = pendingIsWon;
    const wasWon = fromStatus === "convert" || fromStatus === "won" || isWonStatus(fromStatus);

    const patch: LeadWritePayload = { status: toStatus };
    if (toStatus === "lost") patch.lost_reason = note;
    if (toStatus === "follow_up" && followUpAt) {
      patch.follow_up_date = followUpAt;
    }
    if (movingToWon) {
      patch.deal_value = dealAmount ?? null;
      patch.won_at = new Date().toISOString();
    } else if (wasWon) {
      patch.deal_value = null;
      patch.won_at = null;
    }
    const updated = await Leads.update(lead.id, patch);

    const amountLine =
      movingToWon && dealAmount != null
        ? `\nFinal Sale Amount: ৳${Number(dealAmount).toLocaleString("en-IN")}`
        : "";
    const desc = `${fromLabel} → ${toLabel} · via ${pLabel}\n${note}${amountLine}`;
    await Activities.create(lead.id, {
      type: "status_changed",
      title: `Status: ${fromLabel} → ${toLabel}`,
      description: desc,
      meta: {
        from: fromStatus,
        to: toStatus,
        platform,
        ...(movingToWon ? { deal_value: dealAmount } : {}),
      },
    });

    await Notes.create(
      lead.id,
      `[${fromLabel} → ${toLabel} · ${pLabel}] ${note}${amountLine}`,
    );

    setLead(updated as unknown as Lead);
    void refreshActivities();
    void refreshNotes();
    toast.success(`Moved to ${toLabel}`);
  };

  const refreshNotes = async () => {
    try {
      const res = await Notes.listForLead(leadId);
      setNotes(((res.data ?? []) as unknown as LeadNote[]));
    } catch {
      /* ignore */
    }
  };


  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const load = async () => {
    setLoading(true);
    try {
      const [leadData, actRes, notesRes, repsRes] = await Promise.all([
        Leads.show(leadId),
        Activities.listForLead(leadId),
        Notes.listForLead(leadId),
        SalesUsers.list(),
      ]);
      let lead = leadData as unknown as Lead;

      // Auto-claim: first sales user to open an unassigned lead becomes the owner.
      // Admins do NOT auto-claim — they're supervising, not working leads.
      if (!lead.assigned_to && salesUser?.id && salesUser.role !== "admin") {
        try {
          const claimed = await Leads.assign(leadId, salesUser.id);
          lead = claimed as unknown as Lead;
          await Activities.create(leadId, {
            type: "lead_assigned",
            title: "Auto-assigned",
            description: `${salesUser.full_name ?? "Sales user"} claimed this lead by opening it first.`,
          });
          toast.success("This lead is now assigned to you");
        } catch {
          // Race lost or assign rejected — re-fetch the current state.
          try {
            const refetched = await Leads.show(leadId);
            lead = refetched as unknown as Lead;
          } catch {
            /* ignore */
          }
        }
      }

      setLead(lead);
      setActivities(((actRes.data ?? []) as unknown as LeadActivity[]));
      setNotes(((notesRes.data ?? []) as unknown as LeadNote[]));
      setReps(
        ((repsRes.data ?? []) as unknown as {
          id: string;
          full_name: string;
          role: string;
        }[]).map((r) => ({ id: r.id, full_name: r.full_name, role: r.role })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lead not found");
      navigate({ to: "/sales/leads" });
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (patch: Partial<Lead>) => {
    if (!lead) return;
    const prev = lead;
    setLead({ ...lead, ...patch });
    try {
      const data = await Leads.update(lead.id, patch as LeadWritePayload);
      setLead(data as unknown as Lead);
      void refreshActivities();
    } catch (e) {
      setLead(prev);
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const refreshActivities = async () => {
    try {
      const res = await Activities.listForLead(leadId);
      setActivities(((res.data ?? []) as unknown as LeadActivity[]));
    } catch {
      /* ignore */
    }
  };

  if (loading || !lead) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }

  const av = avatarFor(lead.full_name);
  const sm = getStatusMeta(lead.status, salesStatuses);
  const pm = priorityGetMeta(lead.priority);
  const canEdit = hasPermission(salesUser, "leads.edit");
  const assigneeName =
    reps.find((r) => r.id === lead.assigned_to)?.full_name ?? "Unassigned";

  const daysInPipeline = Math.max(
    1,
    Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000),
  );
  const engagement = Math.min(100, activities.length * 10);
  const engColor =
    engagement <= 30 ? "bg-rose-500" : engagement <= 60 ? "bg-amber-500" : "bg-emerald-500";
  const engLabel =
    engagement <= 30 ? "Low" : engagement <= 60 ? "Medium" : "High";

  return (
    <div className="space-y-4">
      <Link
        to="/sales/leads"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Back to All Leads
      </Link>

      {/* HEADER */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-xl font-extrabold text-white",
                av.color,
              )}
            >
              {av.initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight">{lead.full_name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <a
                  href={`tel:${formatPhone(lead.phone)}`}
                  className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhone(lead.phone)}
                </a>
                {(lead.whatsapp || lead.phone) && (
                  <button
                    type="button"
                    onClick={() => setWaOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600"
                    title="Send WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isAdmin && !lead.is_active && (
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                  Inactive
                </span>
              )}
              <HeaderInfoChips lead={lead} assigneeName={assigneeName} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
                    sm.bg,
                    sm.text,
                  )}
                >
                  {sm.dot && <span className="sales-pulse-dot" />}
                  {sm.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {activeStatuses.map((row) => {
                  const meta = getStatusMeta(row.key, salesStatuses);
                  return (
                    <DropdownMenuItem
                      key={row.key}
                      onClick={() => requestStatusChange(row.key)}
                    >
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          meta.bg,
                          meta.text,
                        )}
                      >
                        {meta.label}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                pm.bg,
                pm.text,
              )}
            >
              {pm.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ActionBtn href={`tel:${formatPhone(lead.phone)}`} icon={<Phone className="h-3.5 w-3.5" />} label="Call" />
            {(lead.whatsapp || lead.phone) && (
              <ActionBtn
                onClick={() => setWaOpen(true)}
                icon={<MessageCircle className="h-3.5 w-3.5" />}
                label="WhatsApp"
              />
            )}
            {lead.email && (
              <ActionBtn
                href={`mailto:${lead.email}`}
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
              />
            )}
            {canEdit && (
              <ActionBtn
                icon={<Edit className="h-3.5 w-3.5" />}
                label="Edit"
                onClick={() => setEditOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* NEXT ACTION BANNER */}
      <NextActionBanner lead={lead} onChange={updateLead} />

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Clock className="h-4 w-4" />} label="Last Activity" value={relativeTime(lead.last_activity_at)} delay={0} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Days in Pipeline" value={`${daysInPipeline} days`} delay={0.05} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Total Activities" value={String(activities.length)} delay={0.1} />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-4 w-4" /> Engagement
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-extrabold">{engagement}</span>
            <span className="text-xs text-muted-foreground">{engLabel}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted">
            <div className={cn("h-full rounded-full", engColor)} style={{ width: `${engagement}%` }} />
          </div>
        </motion.div>
      </div>

      {/* TWO COLUMN */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Timeline
            activities={activities}
            reps={reps}
            isAdmin={isAdmin}
            flashId={flashActivityId}
            onLogged={(act) => {
              setActivities((all) => [act, ...all]);
              setFlashActivityId(act.id);
              setTimeout(() => setFlashActivityId(null), 2500);
            }}
            leadId={leadId}
          />
          <InfoPanels
            lead={lead}
            assigneeName={assigneeName}
            notes={notes}
            currentUserId={salesUser?.id ?? ""}
            isAdmin={isAdmin}
            onNoteAdded={(n) => setNotes((all) => [n, ...all])}
            onNoteDeleted={(id) => setNotes((all) => all.filter((x) => x.id !== id))}
          />
        </div>
        <RightPanel
          lead={lead}
          reps={reps}
          isAdmin={isAdmin}
          onUpdate={updateLead}
          onRequestStatus={requestStatusChange}
          pipeline={pipelineStatuses}
        />
      </div>

      <StatusChangeDialog
        open={pendingStatus !== null}
        fromStatus={lead.status}
        toStatus={pendingStatus}
        isWonTransition={pendingIsWon}
        suggestedAmount={suggestedDealAmount}
        requireFollowUp={pendingStatus === "follow_up"}
        onClose={() => setPendingStatus(null)}
        onConfirm={confirmStatusChange}
      />

      <WhatsAppDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        lead={lead}
        onSent={(act) => {
          setActivities((all) => [act, ...all]);
          setFlashActivityId(act.id);
          setTimeout(() => setFlashActivityId(null), 1500);
        }}
      />

      <AddLeadModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={lead}
        isAdmin={isAdmin}
        currentUserId={salesUser?.id ?? ""}
        reps={reps}
        onUpdated={(updated) => {
          setLead(updated);
          setEditOpen(false);
        }}
      />
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition";
  if (href)
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
        {icon}
        {label}
      </a>
    );
  return (
    <button onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function HeaderInfoChips({ lead, assigneeName }: { lead: Lead; assigneeName: string }) {
  const { getMeta: getSourceMeta } = useSalesSources();
  const sourceMeta = getSourceMeta(lead.source);
  const SourceIcon = sourceMeta.icon;
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const followUp = lead.follow_up_date
    ? new Date(lead.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  const budget = BUDGET_OPTIONS.find((b) => b.value === lead.budget_range)?.label;

  const Chip = ({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) => (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground", className)}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <Chip icon={SourceIcon}>{sourceMeta.label}</Chip>
      {lead.courses.map((c) => {
        const m = getCourseMeta(c);
        return (
          <span key={c} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", m.bg, m.text)}>
            <BookOpen className="h-3.5 w-3.5" />
            {m.label}
          </span>
        );
      })}
      {lead.email && <Chip icon={Mail}>{lead.email}</Chip>}
      {location && <Chip icon={MapPin}>{location}</Chip>}
      <Chip icon={User}>{assigneeName}</Chip>
      {lead.batch_preference && <Chip icon={Clock}>{lead.batch_preference}</Chip>}
      {budget && <Chip icon={Wallet}>{budget}</Chip>}
      {lead.child_age != null && <Chip icon={Baby}>{lead.child_age} yrs</Chip>}
      {followUp && <Chip icon={CalendarPlus}>FU: {followUp}</Chip>}
      <Chip icon={Calendar}>Added {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</Chip>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </motion.div>
  );
}

function NextActionBanner({
  lead,
  onChange,
}: {
  lead: Lead;
  onChange: (patch: Partial<Lead>) => void;
}) {
  if (!lead.follow_up_date) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Calendar className="h-4 w-4 shrink-0" />
        <span>
          No follow-up scheduled yet —{" "}
          <a href="#schedule" className="font-bold underline">
            Schedule Now
          </a>
        </span>
      </div>
    );
  }
  const d = new Date(lead.follow_up_date);
  const overdue = d.getTime() < Date.now();
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        overdue
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      <span className="inline-flex items-center gap-2 font-semibold">
        <Calendar className="h-4 w-4 shrink-0" />
        Next: {lead.follow_up_type ?? "follow-up"} on{" "}
        <strong>
          {d.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}{" "}
          at{" "}
          {d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </strong>
        {overdue && " (OVERDUE)"}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange({ follow_up_date: null })}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Mark Complete
        </Button>
      </div>
    </div>
  );
}

/* ============ TIMELINE ============ */
function Timeline({
  activities,
  reps,
  isAdmin,
  leadId,
  flashId,
  onLogged,
}: {
  activities: LeadActivity[];
  reps: { id: string; full_name: string }[];
  isAdmin: boolean;
  leadId: string;
  flashId: string | null;
  onLogged: (a: LeadActivity) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ActivityType>("call_attempt");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const isCallType = type === "call_attempt" || type === "call_connected";

  const save = async () => {
    if (!desc.trim()) {
      toast.error("Description required");
      return;
    }
    setSaving(true);
    const meta = ACTIVITY_META[type];
    try {
      const data = await Activities.create(leadId, {
        type,
        title: meta.label,
        description: desc.trim(),
        duration_minutes: isCallType && duration ? Number(duration) : null,
      });
      onLogged(data as unknown as LeadActivity);
      setDesc("");
      setDuration("");
      setAdding(false);
      toast.success("Activity logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log activity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-extrabold">Activity Timeline</h3>
        <Button size="sm" onClick={() => setAdding((a) => !a)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Log Activity
        </Button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-xl border border-border bg-muted/40 p-4"
          >
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Activity Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["call_attempt", "call_connected", "whatsapp_sent", "email_sent", "note_added"] as ActivityType[]).map((t) => {
                      const ItemIcon = ACTIVITY_META[t].icon;
                      return (
                        <SelectItem key={t} value={t}>
                          <span className="inline-flex items-center gap-2">
                            <ItemIcon className="h-3.5 w-3.5" />
                            {ACTIVITY_META[t].label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
              {isCallType && (
                <div>
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  Save Activity
                </Button>
                <button
                  onClick={() => setAdding(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No activities yet.</p>
      ) : (
        <ol className="relative space-y-5">
          <span className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
          {activities.map((a, i) => {
            const m = getActivityMeta(a.type);
            const ActIcon = m.icon;
            const rep = reps.find((r) => r.id === a.created_by);
            const repAv = rep ? avatarFor(rep.full_name) : null;
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: a.id === flashId ? "rgba(16,185,129,0.12)" : "transparent",
                }}
                transition={{ delay: i * 0.05 }}
                className="relative flex gap-3 rounded-lg p-1.5 pl-0"
              >
                <div className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", m?.bg, m?.text)}>
                  <ActIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">{a.title}</p>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={new Date(a.created_at).toLocaleString()}
                    >
                      {relativeTime(a.created_at)}
                    </span>
                  </div>
                  {a.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>}
                  {a.duration_minutes != null && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {a.duration_minutes} min</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {repAv ? (
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white", repAv.color)}>
                          {repAv.initials}
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">
                          ?
                        </span>
                      )}
                      <span className="font-semibold text-foreground">
                        {rep?.full_name ?? "Unknown user"}
                      </span>
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(a.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      if (!confirm("Delete activity?")) return;
                      try {
                        await Activities.remove(a.id);
                        toast.success("Deleted");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Delete failed",
                        );
                      }
                    }}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </button>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ============ INFO PANELS ============ */
function InfoPanels({
  lead,
  assigneeName,
  notes,
  currentUserId,
  isAdmin,
  onNoteAdded,
  onNoteDeleted,
}: {
  lead: Lead;
  assigneeName: string;
  notes: LeadNote[];
  currentUserId: string;
  isAdmin: boolean;
  onNoteAdded: (n: LeadNote) => void;
  onNoteDeleted: (id: string) => void;
}) {
  const { getMeta: getSourceMeta } = useSalesSources();
  const sourceMeta = getSourceMeta(lead.source);
  const SourceIcon = sourceMeta.icon;
  return (
    <div className="space-y-3">
      <Collapsible title="Contact Details" icon={<Phone className="h-4 w-4" />} defaultOpen>
        <Row label={<RowLabel icon={Phone}>Phone</RowLabel>} value={<a href={`tel:${formatPhone(lead.phone)}`} className="text-primary">{formatPhone(lead.phone)}</a>} />
        <Row label={<RowLabel icon={Smartphone}>Secondary</RowLabel>} value={lead.secondary_phone ? formatPhone(lead.secondary_phone) : "—"} />
        <Row label={<RowLabel icon={Mail}>Email</RowLabel>} value={lead.email ? <a href={`mailto:${lead.email}`} className="text-primary">{lead.email}</a> : "—"} />
        <Row label={<RowLabel icon={MessageCircle}>WhatsApp</RowLabel>} value={lead.whatsapp ? formatPhone(lead.whatsapp) : "—"} />
        <Row label={<RowLabel icon={MapPin}>City, State</RowLabel>} value={[lead.city, lead.state].filter(Boolean).join(", ") || "—"} />
      </Collapsible>

      <Collapsible title="Lead Information" icon={<Info className="h-4 w-4" />} defaultOpen>
        <Row label={<RowLabel icon={Megaphone}>Source</RowLabel>} value={<span className="flex items-center gap-1.5"><SourceIcon className={cn("h-4 w-4", sourceMeta.color)} />{sourceMeta.label}</span>} />
        <Row label={<RowLabel icon={Megaphone}>Campaign</RowLabel>} value={lead.campaign_name ?? "—"} />
        <Row label={<RowLabel icon={BookOpen}>Courses</RowLabel>} value={
          <div className="flex flex-wrap gap-1">
            {lead.courses.length === 0 ? "—" : lead.courses.map((c) => {
              const m = getCourseMeta(c);
              return (
                <span key={c} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", m.bg, m.text)}>{m.label}</span>
              );
            })}
          </div>
        } />
        <Row label={<RowLabel icon={Calendar}>Date Added</RowLabel>} value={new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
        <Row label={<RowLabel icon={User}>Assigned To</RowLabel>} value={assigneeName} />
        <Row label={<RowLabel icon={CalendarPlus}>Next Follow-up</RowLabel>} value={lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleString() : "—"} />
      </Collapsible>

      <Collapsible title="Qualification Details" icon={<CheckSquare className="h-4 w-4" />}>
        <Row label={<RowLabel icon={Baby}>Child's Age</RowLabel>} value={lead.child_age?.toString() ?? "—"} />
        <Row label={<RowLabel icon={Info}>District (জেলা)</RowLabel>} value={lead.district ?? "—"} />
        <Row label={<RowLabel icon={Info}>Class (কোন ক্লাসে পড়ে)</RowLabel>} value={lead.student_class ?? "—"} />
        <Row label={<RowLabel icon={Clock}>Preferred Batch</RowLabel>} value={lead.batch_preference ?? "—"} />
        <Row label={<RowLabel icon={Wallet}>Budget</RowLabel>} value={BUDGET_OPTIONS.find((b) => b.value === lead.budget_range)?.label ?? "—"} />
      </Collapsible>

      {lead.additional_fields && Object.keys(lead.additional_fields).length > 0 && (
        <Collapsible title="Additional Fields" icon={<Sparkles className="h-4 w-4" />} defaultOpen>
          {Object.entries(lead.additional_fields).map(([k, v]) => (
            <Row
              key={k}
              label={<RowLabel icon={Info}>{k}</RowLabel>}
              value={String(v) || "—"}
            />
          ))}
        </Collapsible>
      )}

      <NotesPanel
        leadId={lead.id}
        notes={notes}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onAdded={onNoteAdded}
        onDeleted={onNoteDeleted}
      />
    </div>
  );
}

function Collapsible({
  title,
  icon,
  defaultOpen = false,
  rightSlot,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
          {icon}
          <span className="text-sm font-bold">{title}</span>
          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {rightSlot && <div className="ml-2">{rightSlot}</div>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}

function RowLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </>
  );
}

function NotesPanel({
  leadId,
  notes,
  currentUserId,
  isAdmin,
  onAdded,
  onDeleted,
}: {
  leadId: string;
  notes: LeadNote[];
  currentUserId: string;
  isAdmin: boolean;
  onAdded: (n: LeadNote) => void;
  onDeleted: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const ok: File[] = [];
    for (const f of list) {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name} 20MB-এর বেশি`);
        continue;
      }
      ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok].slice(0, 10));
    e.target.value = "";
  };

  const save = async () => {
    if (!body.trim() && files.length === 0) return;
    setSaving(true);
    let noteRow: LeadNote;
    try {
      const created = await Notes.create(leadId, body.trim() || "(attachment)");
      noteRow = created as unknown as LeadNote;
    } catch (e) {
      setSaving(false);
      toast.error(e instanceof Error ? e.message : "Failed to save note");
      return;
    }

    const uploaded: NoteAttachment[] = [];
    for (const f of files) {
      try {
        const att = await Notes.attachments.upload(noteRow.id, f);
        uploaded.push(att as unknown as NoteAttachment);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Upload failed: ${f.name}`);
      }
    }

    setSaving(false);
    onAdded({ ...noteRow, attachments: uploaded });
    setBody("");
    setFiles([]);
    setAdding(false);
    toast.success(uploaded.length ? `Note + ${uploaded.length} file(s) saved` : "Note added");
  };

  return (
    <Collapsible
      title="Notes"
      icon={<MessageSquare className="h-4 w-4" />}
      defaultOpen
      rightSlot={
        <Button size="sm" variant="ghost" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {adding && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <Textarea
            placeholder="Add a note about this lead..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs">
                  <Paperclip className="h-3 w-3" /> {f.name}
                  <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="ml-1 text-muted-foreground hover:text-rose-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Note"}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
              <Paperclip className="h-3.5 w-3.5" /> Attach
              <input type="file" multiple className="hidden" onChange={onPick} />
            </label>
            <button onClick={() => { setAdding(false); setFiles([]); }} className="text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
      {notes.length === 0 && !adding && (
        <p className="py-2 text-center text-xs text-muted-foreground">No notes yet.</p>
      )}
      {notes.map((n) => (
        <div key={n.id} className="group rounded-lg bg-muted/50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {relativeTime(n.created_at)}
            </span>
            {(n.author_id === currentUserId || isAdmin) && (
              <button
                onClick={async () => {
                  if (!confirm("Delete note?")) return;
                  try {
                    await Notes.remove(n.id);
                    onDeleted(n.id);
                    toast.success("Deleted");
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Delete failed",
                    );
                  }
                }}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </button>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{n.body}</p>
          {n.attachments && n.attachments.length > 0 && (
            <NoteAttachments items={n.attachments} />
          )}
        </div>
      ))}
    </Collapsible>
  );
}

/* ============ NOTE ATTACHMENTS RENDERER ============ */
function NoteAttachments({ items }: { items: NoteAttachment[] }) {
  const isImage = (m?: string | null) => !!m && m.startsWith("image/");
  const fmtSize = (n: number | null) => {
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((a) => {
        const url = a.url ?? undefined;
        if (isImage(a.mime_type)) {
          return (
            <a
              key={a.id}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block h-20 w-20 overflow-hidden rounded-md border border-border bg-muted"
              title={a.file_name}
            >
              {url ? (
                <img src={url} alt={a.file_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
            </a>
          );
        }
        return (
          <a
            key={a.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            title={a.file_name}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[160px] truncate">{a.file_name}</span>
            <span className="text-[10px] text-muted-foreground">{fmtSize(a.size_bytes)}</span>
            <Download className="h-3 w-3 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}

/* ============ RIGHT PANEL ============ */
function RightPanel({
  lead,
  reps,
  isAdmin,
  onUpdate,
  onRequestStatus,
  pipeline,
}: {
  lead: Lead;
  reps: { id: string; full_name: string; role: string }[];
  isAdmin: boolean;
  onUpdate: (patch: Partial<Lead>) => void | Promise<void>;
  onRequestStatus: (next: LeadStatus) => void;
  pipeline: import("@/lib/leads").SalesStatus[];
}) {
  const currentIdx = pipeline.findIndex((p) => p.key === lead.status);
  const isLost = lead.status === "lost";

  // Schedule follow-up state
  const initial = lead.follow_up_date ? new Date(lead.follow_up_date) : null;
  const [date, setDate] = useState(initial ? initial.toISOString().slice(0, 10) : "");
  const [time, setTime] = useState(initial ? initial.toTimeString().slice(0, 5) : "10:00");
  const [fuType, setFuType] = useState<FollowUpType>(lead.follow_up_type ?? "call");
  const [reminder, setReminder] = useState<number>(lead.follow_up_reminder_minutes ?? 15);
  const [fuNotes, setFuNotes] = useState(lead.follow_up_notes ?? "");
  const [savingFu, setSavingFu] = useState(false);

  const [assignTo, setAssignTo] = useState(lead.assigned_to ?? "");

  const scheduleFu = async () => {
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    setSavingFu(true);
    const iso = new Date(`${date}T${time}:00`).toISOString();
    onUpdate({
      follow_up_date: iso,
      follow_up_type: fuType,
      follow_up_reminder_minutes: reminder,
      follow_up_notes: fuNotes || null,
    });
    setSavingFu(false);
    toast.success("Follow-up scheduled");
  };

  // (Lost flow now goes through the unified status-change dialog.)

  const saveAssign = () => {
    onUpdate({ assigned_to: assignTo || null });
    toast.success("Assignment updated");
  };

  return (
    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      {/* Status Pipeline */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Lead Status</p>
        <ol className="space-y-3">
          {pipeline.map((row, i) => {
            const past = !isLost && i < currentIdx;
            const current = !isLost && i === currentIdx;
            const future = isLost || i > currentIdx;
            const sm = getStatusMeta(row.key, pipeline);
            return (
              <li key={row.key}>
                <button
                  onClick={() => !current && onRequestStatus(row.key)}
                  disabled={current}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition",
                    !current && "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px]",
                      past && "border-emerald-500 bg-emerald-500 text-white",
                      current && cn(sm.bg, sm.text, "border-transparent"),
                      future && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {past ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      current ? "font-extrabold" : past ? "font-semibold text-muted-foreground" : "text-muted-foreground",
                    )}
                  >
                    {sm.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {!isLost && (
          <div className="mt-4 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onRequestStatus("lost")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Mark as Lost
            </Button>
          </div>
        )}
        {isLost && lead.lost_reason && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
            <AlertCircle className="mr-1 inline h-3 w-3" />
            {lead.lost_reason}
          </div>
        )}
      </div>

      {/* Deal value & payments */}
      <DealAndPayments lead={lead} onLeadUpdate={onUpdate} />

      {/* Active status (admin) */}
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
            {lead.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            Lead Visibility
          </p>
          <div className="mb-3 rounded-lg bg-muted/60 p-3 text-xs font-medium text-muted-foreground">
            {lead.is_active
              ? "Active leads are visible to assigned sales executives."
              : "Inactive leads are visible only to sales admins."}
          </div>
          <Button
            variant={lead.is_active ? "outline" : "default"}
            className={cn(
              "w-full",
              lead.is_active && "border-slate-300 text-slate-700 hover:bg-slate-50",
            )}
            onClick={() => onUpdate({ is_active: !lead.is_active })}
          >
            {lead.is_active ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Mark Inactive
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Activate Lead
              </>
            )}
          </Button>
        </div>
      )}

      {/* Schedule Follow-up */}
      <div id="schedule" className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          <CalendarPlus className="h-4 w-4" />
          Schedule Follow-up
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Interaction Type</Label>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {(["call", "whatsapp", "email", "visit"] as FollowUpType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFuType(t)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-semibold capitalize transition",
                    fuType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Reminder</Label>
            <Select value={String(reminder)} onValueChange={(v) => setReminder(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 min before</SelectItem>
                <SelectItem value="15">15 min before</SelectItem>
                <SelectItem value="30">30 min before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={scheduleFu} disabled={savingFu} className="w-full">
            <CalendarPlus className="mr-1 h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Assign (admin) */}
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
            <User className="h-4 w-4" />
            Assigned To
          </p>
          <Select value={assignTo} onValueChange={setAssignTo}>
            <SelectTrigger>
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.full_name} ({r.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={saveAssign} className="mt-3 w-full" size="sm">
            Save Assignment
          </Button>
        </div>
      )}
    </div>
  );
}
