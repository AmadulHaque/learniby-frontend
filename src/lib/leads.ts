// Leads domain types, constants & helpers (Sales Panel)
import {
  Facebook,
  Instagram,
  Globe,
  MessageCircle,
  Users as UsersIcon,
  Search as SearchIcon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// LeadStatus is now an open string — actual list lives in the sales_statuses table.
// Built-in keys are kept here for fallback styling and legacy code paths.
export type LeadStatus = string;
export type BuiltinStatus =
  | "intake"
  | "no_response"
  | "disqualified"
  | "ready_for_class"
  | "follow_up"
  | "convert"
  | "lost";
export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type LeadSource =
  | "facebook"
  | "google"
  | "instagram"
  | "whatsapp"
  | "referral"
  | "website"
  | "other";
// Courses are now dynamic — actual list lives in sales_courses table.
// LeadCourse stays as `string` so legacy code keeps compiling.
export type LeadCourse = string;
export type BatchPreference = "morning" | "evening" | "weekend";
export type BudgetRange =
  | "under_5k"
  | "5k_10k"
  | "10k_20k"
  | "20k_30k"
  | "above_30k"
  | "not_disclosed";

export type FollowUpType = "call" | "whatsapp" | "email" | "visit";

export type ActivityType =
  | "call_attempt"
  | "call_connected"
  | "whatsapp_sent"
  | "email_sent"
  | "note_added"
  | "status_changed"
  | "follow_up_scheduled"
  | "lead_created"
  | "lead_assigned";

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  meta: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  attachments?: NoteAttachment[];
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  secondary_phone: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  source: LeadSource;
  campaign_name: string | null;
  courses: LeadCourse[];
  course_data: Record<string, Record<string, unknown>>;
  priority: LeadPriority;
  child_age: number | null;
  district: string | null;
  student_class: string | null;
  batch_preference: BatchPreference | null;
  budget_range: BudgetRange | null;
  is_active: boolean;
  status: LeadStatus;
  assigned_to: string | null;
  follow_up_type: FollowUpType | null;
  follow_up_reminder_minutes: number | null;
  follow_up_notes: string | null;
  lost_reason: string | null;
  created_by: string | null;
  follow_up_date: string | null;
  last_activity_at: string;
  notes: string | null;
  deal_value: number | null;
  won_at: string | null;
  created_at: string;
  updated_at: string;
  additional_fields: Record<string, string>;
  lead_score: number;
  score_breakdown: {
    engagement?: number;
    recency?: number;
    response_time?: number;
    status?: number;
    priority?: number;
    completeness?: number;
    total?: number;
  };
  score_updated_at: string | null;
  status_changed_at: string;
  monthly_fees: Record<string, number>;
}

export function stageAge(statusChangedAt: string | null | undefined): {
  days: number;
  label: string;
  shortLabel: string;
  tier: "fresh" | "normal" | "aging" | "stale";
  bg: string;
  text: string;
  ring: string;
} {
  if (!statusChangedAt) {
    return { days: 0, label: "Just now", shortLabel: "0d", tier: "fresh", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" };
  }
  const ms = Date.now() - new Date(statusChangedAt).getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  let tier: "fresh" | "normal" | "aging" | "stale";
  if (days <= 1) tier = "fresh";
  else if (days <= 3) tier = "normal";
  else if (days <= 7) tier = "aging";
  else tier = "stale";

  const shortLabel = days === 0 ? `${hours}h` : `${days}d`;
  const label =
    days === 0
      ? hours === 0
        ? "Just now"
        : `${hours}h in stage`
      : `${days}d in stage`;

  const palette = {
    fresh:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    normal: { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
    aging:  { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200" },
    stale:  { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200" },
  } as const;
  return { days, label, shortLabel, tier, ...palette[tier] };
}

export function scoreTier(score: number): {
  label: string;
  bg: string;
  text: string;
  ring: string;
} {
  if (score >= 80) return { label: "Hot", bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-300" };
  if (score >= 60) return { label: "Warm", bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-300" };
  if (score >= 40) return { label: "Cool", bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-300" };
  if (score >= 20) return { label: "Cold", bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-300" };
  return { label: "Icy", bg: "bg-slate-50", text: "text-slate-400", ring: "ring-slate-200" };
}

export function formatMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "৳" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function monthKey(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export interface StatusMeta {
  label: string;
  bg: string;
  text: string;
  dot?: boolean;
  is_won?: boolean;
}

// Fallback meta for the 5 built-in keys. Custom statuses get computed styles
// from sales_statuses.color via getStatusMeta().
export const STATUS_META: Record<string, StatusMeta> = {
  intake:          { label: "Intake",          bg: "bg-blue-100",    text: "text-blue-700", dot: true },
  no_response:     { label: "No Response",     bg: "bg-amber-100",   text: "text-amber-800" },
  disqualified:    { label: "Disqualified",    bg: "bg-slate-100",   text: "text-slate-700" },
  ready_for_class: { label: "Ready for Class", bg: "bg-violet-100",  text: "text-violet-700" },
  follow_up:       { label: "Follow-Up",       bg: "bg-indigo-100",  text: "text-indigo-700" },
  convert:         { label: "Convert",         bg: "bg-emerald-100", text: "text-emerald-700", is_won: true },
  lost_pending:    { label: "Lost Pending",    bg: "bg-orange-100",  text: "text-orange-700" },
  lost:            { label: "Lost",            bg: "bg-rose-50",     text: "text-rose-500" },
};

// Tailwind color → bg/text class map (kept inline so PurgeCSS sees the classes).
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  blue:    { bg: "bg-blue-100",    text: "text-blue-700" },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-700" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-700" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-700" },
  pink:    { bg: "bg-pink-100",    text: "text-pink-700" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-700" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-800" },
  orange:  { bg: "bg-orange-100",  text: "text-orange-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  sky:     { bg: "bg-sky-100",     text: "text-sky-700" },
  slate:   { bg: "bg-slate-100",   text: "text-slate-700" },
};

export interface SalesStatus {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_won: boolean;
  is_default: boolean;
}

export function statusMetaFromRow(s: SalesStatus): StatusMeta {
  const c = STATUS_COLORS[s.color] ?? STATUS_COLORS.blue;
  return { label: s.label, bg: c.bg, text: c.text, is_won: s.is_won };
}

/** Resolve display meta for any status key (custom or built-in). */
export function getStatusMeta(key: string, list?: SalesStatus[] | null): StatusMeta {
  const row = list?.find((s) => s.key === key);
  if (row) return statusMetaFromRow(row);
  if (STATUS_META[key]) return STATUS_META[key];
  return { label: key, bg: "bg-slate-100", text: "text-slate-700" };
}

export const PRIORITY_META: Record<
  LeadPriority,
  { label: string; bg: string; text: string }
> = {
  low: { label: "Low", bg: "bg-slate-100", text: "text-slate-700" },
  medium: { label: "Medium", bg: "bg-amber-100", text: "text-amber-700" },
  high: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { label: "Urgent", bg: "bg-rose-100", text: "text-rose-700" },
};

// Legacy fallback course meta — used when SalesCourses context isn't loaded yet.
export const COURSE_META: Record<string, { label: string; bg: string; text: string }> = {
  abacus_kids: { label: "Abacus Kids", bg: "bg-amber-100", text: "text-amber-800" },
  teacher_training: { label: "Teacher Training", bg: "bg-purple-100", text: "text-purple-800" },
  phonics: { label: "Phonics", bg: "bg-emerald-100", text: "text-emerald-800" },
};

const COURSE_PALETTE = [
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-emerald-100", text: "text-emerald-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-rose-100", text: "text-rose-800" },
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
  { bg: "bg-orange-100", text: "text-orange-800" },
];

/** Resolve display meta for any course key (custom or built-in). */
export function getCourseMeta(
  key: string,
  list?: { key: string; name: string }[] | null,
): { label: string; bg: string; text: string } {
  const row = list?.find((c) => c.key === key);
  if (row) {
    if (COURSE_META[key]) return { ...COURSE_META[key], label: row.name };
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const p = COURSE_PALETTE[Math.abs(h) % COURSE_PALETTE.length];
    return { ...p, label: row.name };
  }
  if (COURSE_META[key]) return COURSE_META[key];
  return { label: key, bg: "bg-slate-100", text: "text-slate-700" };
}

export const SOURCE_META: Record<
  LeadSource,
  { label: string; icon: LucideIcon; color: string }
> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-600" },
  google: { label: "Google", icon: SearchIcon, color: "text-red-500" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  referral: { label: "Referral", icon: UsersIcon, color: "text-violet-500" },
  website: { label: "Website", icon: Globe, color: "text-sky-500" },
  other: { label: "Other", icon: Sparkles, color: "text-slate-500" },
};

export const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "under_5k", label: "Under ৳5,000" },
  { value: "5k_10k", label: "৳5,000–10,000" },
  { value: "10k_20k", label: "৳10,000–20,000" },
  { value: "20k_30k", label: "৳20,000–30,000" },
  { value: "above_30k", label: "Above ৳30,000" },
  { value: "not_disclosed", label: "Not Disclosed" },
];

export const BATCH_OPTIONS: { value: BatchPreference; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "weekend", label: "Weekend" },
];

const AVATAR_PALETTE = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
];

export function avatarFor(name: string) {
  const clean = (name || "").trim();
  const initials = clean
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  // FNV-1a-style hash across the WHOLE name so similar first letters
  // (M, S, A, etc.) still get distinct palette colors.
  let hash = 2166136261;
  const src = clean.toLowerCase() || "?";
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  const code = hash % AVATAR_PALETTE.length;
  return { initials: initials || "?", color: AVATAR_PALETTE[code] };
}

/**
 * Format a phone number for display. Always prefixes with +88 (Bangladesh)
 * unless an explicit international prefix already exists. Accepts raw input
 * like "01712345678", "1712345678", "8801712345678", "+8801712345678".
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("88")) return `+${digits}`;
  digits = digits.replace(/^0+/, "");
  return `+88${digits}`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function followUpLabel(iso: string | null): {
  label: string;
  overdue: boolean;
  today: boolean;
} {
  if (!iso) return { label: "—", overdue: false, today: false };
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return { label: "Today", overdue: false, today: true };
  if (d.getTime() < now.getTime() - 24 * 3600 * 1000)
    return { label: "OVERDUE", overdue: true, today: false };
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
    today: false,
  };
}
