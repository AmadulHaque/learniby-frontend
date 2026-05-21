/**
 * Sales panel API client — typed wrappers for every /api/v1/sales/* endpoint.
 *
 * Conventions:
 *  - Single Eloquent resources (e.g. one Lead) are returned RAW (no `data:` envelope)
 *    because backend resources set `$wrap = null`.
 *  - Collections are wrapped by Laravel as `{ data: [...] }` and paginated calls add
 *    `meta` + `links`. The helpers return that envelope unchanged so callers can read
 *    `result.data` and (when paginated) `result.meta`.
 */

import { apiGet, apiPost, apiPatch, apiDelete, api, type ApiRequest } from "@/lib/api";
import type {
  Lead,
  LeadActivity,
  LeadNote,
  NoteAttachment,
  LeadStatus,
  LeadPriority,
  LeadSource,
  BatchPreference,
  BudgetRange,
  FollowUpType,
  ActivityType,
} from "@/lib/leads";

// =======================
// Shared response envelopes
// =======================
export interface Paginated<T> {
  data: T[];
  links?: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path?: string;
  };
}

export interface Collection<T> {
  data: T[];
}

export interface Envelope<T> {
  data: T;
}

// =======================
// Taxonomy types
// =======================
export interface SalesStatusRow {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_won: boolean;
  is_default: boolean;
}

export interface SalesPriorityRow {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

export interface SalesLeadSourceRow {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SalesPaymentMethodRow {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface SalesExpenseCategoryRow {
  id: string;
  key: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SalesCourseField {
  id: string;
  course_id: string;
  field_key: string;
  label: string;
  field_type: string;
  options: unknown;
  required: boolean;
  sort_order: number;
}

export interface SalesCourse {
  id: string;
  name: string;
  key: string;
  short_code: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  default_price: number | null;
  admission_fee: number | null;
  monthly_fee: number | null;
  fields?: SalesCourseField[];
}

export interface SalesMessageTemplate {
  id: string;
  name: string;
  category: string | null;
  body: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesSystemSettings {
  id: string | number;
  working_hours_start: string | null;
  working_hours_end: string | null;
  auto_assign_round_robin: boolean;
  created_at?: string;
  updated_at?: string;
}

// =======================
// Sales user / role-permission types
// =======================
export type SalesRole = "admin" | "executive" | string;

export interface SalesUserRow {
  id: string;
  email: string;
  full_name: string;
  role: SalesRole;
  is_active: boolean;
  phone: string | null;
  default_course_id: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  permissions: string[];
  avatar_url: string | null;
  designation: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesRolePermissionRow {
  id: string;
  role: SalesRole;
  permissions: string[];
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
}

// =======================
// Payment / follow-up / expense / target / audit / notification
// =======================
export interface SalesPayment {
  id: string;
  lead_id: string;
  amount: number;
  paid_at: string | null;
  method: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  assigned_to: string | null;
  scheduled_at: string | null;
  type: FollowUpType | string | null;
  reminder_minutes: number | null;
  notes: string | null;
  status: "pending" | "completed" | "cancelled" | string;
  outcome: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Expense {
  id: string;
  category: string | null;
  amount: number;
  description: string | null;
  expense_date: string | null;
  payment_method: string | null;
  paid_to: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesTarget {
  id: string;
  sales_user_id: string;
  month: string;
  target_amount: number;
  period_type: "monthly" | "quarterly" | "yearly" | string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  row_id: string | null;
  lead_id: string | null;
  before_data: unknown;
  after_data: unknown;
  metadata: unknown;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  meta?: unknown;
  created_at: string;
  updated_at?: string;
}

export interface SalesNotificationPref {
  user_id: string;
  follow_up_reminder_inapp: boolean;
  follow_up_reminder_email: boolean;
  overdue_alert: boolean;
  new_lead_assigned: boolean;
  csv_import_complete: boolean;
  status_changed: boolean;
  created_at?: string;
  updated_at?: string;
}

// =======================
// Filter / payload types
// =======================
export interface LeadListFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource | string;
  assigned_to?: string;
  city?: string;
  state?: string;
  search?: string;
  from?: string;
  to?: string;
  won_from?: string;
  won_to?: string;
  sort?: "created_at" | "updated_at" | "follow_up_date" | "last_activity_at" | "lead_score" | "deal_value";
  direction?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

export interface LeadWritePayload {
  full_name?: string;
  phone?: string | null;
  secondary_phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  source?: LeadSource | string | null;
  campaign_name?: string | null;
  courses?: string[] | null;
  priority?: LeadPriority | null;
  child_age?: number | null;
  student_class?: string | null;
  batch_preference?: BatchPreference | null;
  budget_range?: BudgetRange | null;
  status?: LeadStatus | null;
  assigned_to?: string | null;
  follow_up_date?: string | null;
  follow_up_type?: FollowUpType | string | null;
  follow_up_reminder_minutes?: number | null;
  follow_up_notes?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  course_data?: Record<string, Record<string, unknown>> | null;
  monthly_fees?: Record<string, number> | null;
  deal_value?: number | null;
  won_at?: string | null;
  additional_fields?: Record<string, unknown> | null;
  lead_score?: number | null;
  score_breakdown?: Record<string, number> | null;
}

export interface ActivityWritePayload {
  type: ActivityType | string;
  title?: string | null;
  description?: string | null;
  duration_minutes?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface PaymentWritePayload {
  amount: number;
  paid_at?: string | null;
  method?: string | null;
  note?: string | null;
}

export interface FollowUpWritePayload {
  assigned_to?: string | null;
  scheduled_at: string;
  type?: FollowUpType | string | null;
  reminder_minutes?: number | null;
  notes?: string | null;
  status?: "pending" | "completed" | "cancelled" | string;
  outcome?: string | null;
  completed_at?: string | null;
}

export interface ExpenseWritePayload {
  amount: number;
  category?: string | null;
  description?: string | null;
  expense_date?: string | null;
  payment_method?: string | null;
  paid_to?: string | null;
}

export interface TargetWritePayload {
  sales_user_id: string;
  month: string;
  target_amount: number;
  period_type?: "monthly" | "quarterly" | "yearly" | string;
}

export interface SalesUserWritePayload {
  email?: string;
  password?: string;
  full_name?: string;
  role?: SalesRole;
  is_active?: boolean;
  phone?: string | null;
  default_course_id?: string | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  permissions?: string[] | null;
  avatar_url?: string | null;
  designation?: string | null;
}

export type Query = ApiRequest["query"];

// =======================
// Taxonomies — reads (everyone) + writes (admin)
// =======================
export const Statuses = {
  list: () => apiGet<Collection<SalesStatusRow>>("/sales/statuses"),
  create: (body: Partial<SalesStatusRow>) => apiPost<SalesStatusRow>("/sales/statuses", body),
  update: (id: string, body: Partial<SalesStatusRow>) => apiPatch<SalesStatusRow>(`/sales/statuses/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/statuses/${id}`),
};

export const Priorities = {
  list: () => apiGet<Collection<SalesPriorityRow>>("/sales/priorities"),
  create: (body: Partial<SalesPriorityRow>) => apiPost<SalesPriorityRow>("/sales/priorities", body),
  update: (id: string, body: Partial<SalesPriorityRow>) => apiPatch<SalesPriorityRow>(`/sales/priorities/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/priorities/${id}`),
};

export const LeadSources = {
  list: () => apiGet<Collection<SalesLeadSourceRow>>("/sales/lead-sources"),
  create: (body: Partial<SalesLeadSourceRow>) => apiPost<SalesLeadSourceRow>("/sales/lead-sources", body),
  update: (id: string, body: Partial<SalesLeadSourceRow>) =>
    apiPatch<SalesLeadSourceRow>(`/sales/lead-sources/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/lead-sources/${id}`),
};

export const PaymentMethods = {
  list: () => apiGet<Collection<SalesPaymentMethodRow>>("/sales/payment-methods"),
  create: (body: Partial<SalesPaymentMethodRow>) => apiPost<SalesPaymentMethodRow>("/sales/payment-methods", body),
  update: (id: string, body: Partial<SalesPaymentMethodRow>) =>
    apiPatch<SalesPaymentMethodRow>(`/sales/payment-methods/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/payment-methods/${id}`),
};

export const ExpenseCategories = {
  list: () => apiGet<Collection<SalesExpenseCategoryRow>>("/sales/expense-categories"),
  create: (body: Partial<SalesExpenseCategoryRow>) =>
    apiPost<SalesExpenseCategoryRow>("/sales/expense-categories", body),
  update: (id: string, body: Partial<SalesExpenseCategoryRow>) =>
    apiPatch<SalesExpenseCategoryRow>(`/sales/expense-categories/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/expense-categories/${id}`),
};

export const Courses = {
  list: () => apiGet<Collection<SalesCourse>>("/sales/courses"),
  show: (id: string) => apiGet<SalesCourse>(`/sales/courses/${id}`),
  create: (body: Partial<SalesCourse>) => apiPost<SalesCourse>("/sales/courses", body),
  update: (id: string, body: Partial<SalesCourse>) => apiPatch<SalesCourse>(`/sales/courses/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/courses/${id}`),
  fields: {
    list: (courseId: string) => apiGet<Collection<SalesCourseField>>(`/sales/courses/${courseId}/fields`),
    create: (courseId: string, body: Partial<SalesCourseField>) =>
      apiPost<SalesCourseField>(`/sales/courses/${courseId}/fields`, body),
    update: (fieldId: string, body: Partial<SalesCourseField>) =>
      apiPatch<SalesCourseField>(`/sales/course-fields/${fieldId}`, body),
    remove: (fieldId: string) => apiDelete<void>(`/sales/course-fields/${fieldId}`),
  },
};

export const MessageTemplates = {
  list: (category?: string) =>
    apiGet<Collection<SalesMessageTemplate>>("/sales/message-templates", category ? { category } : undefined),
  create: (body: Partial<SalesMessageTemplate>) => apiPost<SalesMessageTemplate>("/sales/message-templates", body),
  update: (id: string, body: Partial<SalesMessageTemplate>) =>
    apiPatch<SalesMessageTemplate>(`/sales/message-templates/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/message-templates/${id}`),
};

export const SystemSettings = {
  show: () => apiGet<SalesSystemSettings>("/sales/system-settings"),
  update: (body: Partial<SalesSystemSettings>) => apiPatch<SalesSystemSettings>("/sales/system-settings", body),
};

// =======================
// Leads + nested resources
// =======================
export const Leads = {
  list: (filters: LeadListFilters = {}) => apiGet<Paginated<Lead>>("/sales/leads", filters as Query),
  show: (id: string) => apiGet<Lead>(`/sales/leads/${id}`),
  create: (body: LeadWritePayload) => apiPost<Lead>("/sales/leads", body),
  update: (id: string, body: LeadWritePayload) => apiPatch<Lead>(`/sales/leads/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/leads/${id}`),
  assign: (id: string, assigned_to: string) => apiPost<Lead>(`/sales/leads/${id}/assign`, { assigned_to }),
};

export const Activities = {
  listAll: (
    filters: { type?: string; created_by?: string; from?: string; to?: string; q?: string; per_page?: number; page?: number } = {},
  ) => apiGet<Paginated<LeadActivity>>("/sales/lead-activities", filters as Query),
  listForLead: (leadId: string) => apiGet<Collection<LeadActivity>>(`/sales/leads/${leadId}/activities`),
  create: (leadId: string, body: ActivityWritePayload) =>
    apiPost<LeadActivity>(`/sales/leads/${leadId}/activities`, body),
  remove: (id: string) => apiDelete<void>(`/sales/lead-activities/${id}`),
};

export const Notes = {
  listForLead: (leadId: string) => apiGet<Collection<LeadNote>>(`/sales/leads/${leadId}/notes`),
  create: (leadId: string, body: string) => apiPost<LeadNote>(`/sales/leads/${leadId}/notes`, { body }),
  update: (noteId: string, body: string) => apiPatch<LeadNote>(`/sales/lead-notes/${noteId}`, { body }),
  remove: (noteId: string) => apiDelete<void>(`/sales/lead-notes/${noteId}`),
  attachments: {
    upload: (noteId: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api<NoteAttachment>({
        method: "POST",
        path: `/sales/lead-notes/${noteId}/attachments`,
        formData: fd,
      });
    },
    remove: (attachmentId: string) => apiDelete<void>(`/sales/lead-note-attachments/${attachmentId}`),
  },
};

export const Payments = {
  list: (
    filters: { lead_id?: string; lead_ids?: string[]; from?: string; to?: string; per_page?: number; page?: number } = {},
  ) => {
    // lead_ids is array — must serialize via individual query repeats. Pass via api() instead of apiGet helper.
    if (filters.lead_ids && filters.lead_ids.length) {
      const params = new URLSearchParams();
      filters.lead_ids.forEach((id) => params.append("lead_ids[]", id));
      const { lead_ids: _omit, ...rest } = filters;
      Object.entries(rest).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
      });
      return api<Paginated<SalesPayment>>({ method: "GET", path: `/sales/payments?${params.toString()}` });
    }
    return apiGet<Paginated<SalesPayment>>("/sales/payments", filters as Query);
  },
  listForLead: (leadId: string) => apiGet<Collection<SalesPayment>>(`/sales/leads/${leadId}/payments`),
  create: (leadId: string, body: PaymentWritePayload) =>
    apiPost<SalesPayment>(`/sales/leads/${leadId}/payments`, body),
  update: (id: string, body: Partial<PaymentWritePayload>) => apiPatch<SalesPayment>(`/sales/payments/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/payments/${id}`),
};

export const FollowUps = {
  list: (filters: { status?: string; lead_id?: string; from?: string; to?: string; per_page?: number; page?: number } = {}) =>
    apiGet<Paginated<FollowUp>>("/sales/follow-ups", filters as Query),
  listForLead: (leadId: string) => apiGet<Collection<FollowUp>>(`/sales/leads/${leadId}/follow-ups`),
  create: (leadId: string, body: FollowUpWritePayload) => apiPost<FollowUp>(`/sales/leads/${leadId}/follow-ups`, body),
  update: (id: string, body: Partial<FollowUpWritePayload>) => apiPatch<FollowUp>(`/sales/follow-ups/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/follow-ups/${id}`),
};

export const Expenses = {
  list: (filters: { category?: string; from?: string; to?: string; per_page?: number; page?: number } = {}) =>
    apiGet<Paginated<Expense>>("/sales/expenses", filters as Query),
  create: (body: ExpenseWritePayload) => apiPost<Expense>("/sales/expenses", body),
  update: (id: string, body: Partial<ExpenseWritePayload>) => apiPatch<Expense>(`/sales/expenses/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/expenses/${id}`),
};

export const Targets = {
  list: (filters: { sales_user_id?: string; month?: string; period_type?: string } = {}) =>
    apiGet<Collection<SalesTarget>>("/sales/targets", filters as Query),
  upsert: (body: TargetWritePayload) => apiPost<SalesTarget>("/sales/targets", body),
  update: (id: string, target_amount: number) => apiPatch<SalesTarget>(`/sales/targets/${id}`, { target_amount }),
  remove: (id: string) => apiDelete<void>(`/sales/targets/${id}`),
};

// =======================
// Users + role permissions
// =======================
export const SalesUsers = {
  list: (filters: { active_only?: boolean; role?: SalesRole; search?: string } = {}) =>
    apiGet<Collection<SalesUserRow>>("/sales/users", filters as Query),
  show: (id: string) => apiGet<SalesUserRow>(`/sales/users/${id}`),
  create: (body: SalesUserWritePayload) => apiPost<SalesUserRow>("/sales/users", body),
  update: (id: string, body: SalesUserWritePayload) => apiPatch<SalesUserRow>(`/sales/users/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/sales/users/${id}`),
};

export const RolePermissions = {
  list: () => apiGet<Envelope<SalesRolePermissionRow[]>>("/sales/role-permissions"),
  show: (id: string) => apiGet<Envelope<SalesRolePermissionRow>>(`/sales/role-permissions/${id}`),
  create: (role: SalesRole, permissions: string[]) =>
    apiPost<Envelope<SalesRolePermissionRow>>("/sales/role-permissions", { role, permissions }),
  update: (id: string, permissions: string[]) =>
    apiPatch<Envelope<SalesRolePermissionRow>>(`/sales/role-permissions/${id}`, { permissions }),
  remove: (id: string) => apiDelete<void>(`/sales/role-permissions/${id}`),
};

// =======================
// Audit logs
// =======================
export const AuditLogs = {
  list: (
    filters: {
      actor_id?: string;
      action?: string;
      table_name?: string;
      row_id?: string;
      lead_id?: string;
      from?: string;
      to?: string;
      per_page?: number;
      page?: number;
    } = {},
  ) => apiGet<Paginated<SalesAuditLog>>("/sales/audit-logs", filters as Query),
};

// =======================
// Notifications + prefs
// =======================
export const Notifications = {
  list: (filters: { unread_only?: boolean; per_page?: number; page?: number } = {}) =>
    apiGet<Paginated<NotificationRow>>("/sales/notifications", filters as Query),
  markRead: (id: string) => apiPost<NotificationRow>(`/sales/notifications/${id}/read`),
  markAllRead: () => apiPost<{ updated: number }>("/sales/notifications/read-all"),
  remove: (id: string) => apiDelete<void>(`/sales/notifications/${id}`),
};

export const NotificationPrefs = {
  show: () => apiGet<SalesNotificationPref>("/sales/notification-prefs"),
  update: (body: Partial<SalesNotificationPref>) =>
    apiPatch<SalesNotificationPref>("/sales/notification-prefs", body),
};
