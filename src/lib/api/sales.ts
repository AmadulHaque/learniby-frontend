// Sales domain API client. All requests authenticate against the `sales` pool.
// Index endpoints return `{ data: [...] }` (Laravel AnonymousResourceCollection)
// — helpers below unwrap and return the bare array.

import { salesApi } from "./client";

interface Wrapped<T> {
  data: T;
}

async function listOf<T>(path: string, query?: Record<string, string | number | boolean | null | undefined>): Promise<T[]> {
  const res = await salesApi.get<Wrapped<T[]> | T[]>(path, query);
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

async function getOne<T>(path: string): Promise<T> {
  const res = await salesApi.get<Wrapped<T> | T>(path);
  if (res && typeof res === "object" && "data" in (res as object)) {
    return (res as Wrapped<T>).data;
  }
  return res as T;
}

async function postOne<T>(path: string, body: unknown): Promise<T> {
  const res = await salesApi.post<Wrapped<T> | T>(path, body);
  if (res && typeof res === "object" && "data" in (res as object)) {
    return (res as Wrapped<T>).data;
  }
  return res as T;
}

async function patchOne<T>(path: string, body: unknown): Promise<T> {
  const res = await salesApi.patch<Wrapped<T> | T>(path, body);
  if (res && typeof res === "object" && "data" in (res as object)) {
    return (res as Wrapped<T>).data;
  }
  return res as T;
}

// ============================================================
// Taxonomies (read-only for non-admins; admin can write via settings.manage perm)
// ============================================================

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
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
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
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface SalesCourseRow {
  id: string;
  key: string;
  name: string;
  short_code: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  default_price: number;
  admission_fee: number;
  monthly_fee: number;
}

export interface SalesCourseFieldRow {
  id: string;
  course_id: string;
  field_key: string;
  label: string;
  field_type: "text" | "number" | "select" | "date";
  options: { value: string; label: string }[] | null;
  required: boolean;
  sort_order: number;
}

export interface SalesMessageTemplateRow {
  id: string;
  key: string;
  name: string;
  channel: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string[] | null;
  is_active: boolean;
  sort_order: number;
}

export interface SalesSystemSettings {
  id: number;
  working_hours_start: string | null;
  working_hours_end: string | null;
  auto_assign_round_robin: boolean;
  updated_at: string | null;
}

export const taxonomy = {
  statuses: {
    list: () => listOf<SalesStatusRow>("/api/v1/sales/statuses"),
    create: (body: Partial<SalesStatusRow>) => postOne<SalesStatusRow>("/api/v1/sales/statuses", body),
    update: (id: string, body: Partial<SalesStatusRow>) => patchOne<SalesStatusRow>(`/api/v1/sales/statuses/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/statuses/${id}`),
  },
  priorities: {
    list: () => listOf<SalesPriorityRow>("/api/v1/sales/priorities"),
    create: (body: Partial<SalesPriorityRow>) => postOne<SalesPriorityRow>("/api/v1/sales/priorities", body),
    update: (id: string, body: Partial<SalesPriorityRow>) => patchOne<SalesPriorityRow>(`/api/v1/sales/priorities/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/priorities/${id}`),
  },
  leadSources: {
    list: () => listOf<SalesLeadSourceRow>("/api/v1/sales/lead-sources"),
    create: (body: Partial<SalesLeadSourceRow>) => postOne<SalesLeadSourceRow>("/api/v1/sales/lead-sources", body),
    update: (id: string, body: Partial<SalesLeadSourceRow>) => patchOne<SalesLeadSourceRow>(`/api/v1/sales/lead-sources/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/lead-sources/${id}`),
  },
  paymentMethods: {
    list: () => listOf<SalesPaymentMethodRow>("/api/v1/sales/payment-methods"),
    create: (body: Partial<SalesPaymentMethodRow>) => postOne<SalesPaymentMethodRow>("/api/v1/sales/payment-methods", body),
    update: (id: string, body: Partial<SalesPaymentMethodRow>) => patchOne<SalesPaymentMethodRow>(`/api/v1/sales/payment-methods/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/payment-methods/${id}`),
  },
  expenseCategories: {
    list: () => listOf<SalesExpenseCategoryRow>("/api/v1/sales/expense-categories"),
    create: (body: Partial<SalesExpenseCategoryRow>) => postOne<SalesExpenseCategoryRow>("/api/v1/sales/expense-categories", body),
    update: (id: string, body: Partial<SalesExpenseCategoryRow>) => patchOne<SalesExpenseCategoryRow>(`/api/v1/sales/expense-categories/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/expense-categories/${id}`),
  },
  courses: {
    list: () => listOf<SalesCourseRow>("/api/v1/sales/courses"),
    show: (id: string) => getOne<SalesCourseRow>(`/api/v1/sales/courses/${id}`),
    create: (body: Partial<SalesCourseRow>) => postOne<SalesCourseRow>("/api/v1/sales/courses", body),
    update: (id: string, body: Partial<SalesCourseRow>) => patchOne<SalesCourseRow>(`/api/v1/sales/courses/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/courses/${id}`),
  },
  courseFields: {
    list: (courseId: string) => listOf<SalesCourseFieldRow>(`/api/v1/sales/courses/${courseId}/fields`),
    create: (courseId: string, body: Partial<SalesCourseFieldRow>) => postOne<SalesCourseFieldRow>(`/api/v1/sales/courses/${courseId}/fields`, body),
    update: (id: string, body: Partial<SalesCourseFieldRow>) => patchOne<SalesCourseFieldRow>(`/api/v1/sales/course-fields/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/course-fields/${id}`),
  },
  messageTemplates: {
    list: () => listOf<SalesMessageTemplateRow>("/api/v1/sales/message-templates"),
    create: (body: Partial<SalesMessageTemplateRow>) => postOne<SalesMessageTemplateRow>("/api/v1/sales/message-templates", body),
    update: (id: string, body: Partial<SalesMessageTemplateRow>) => patchOne<SalesMessageTemplateRow>(`/api/v1/sales/message-templates/${id}`, body),
    remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/message-templates/${id}`),
  },
  systemSettings: {
    show: () => getOne<SalesSystemSettings>("/api/v1/sales/system-settings"),
    update: (body: Partial<SalesSystemSettings>) => patchOne<SalesSystemSettings>("/api/v1/sales/system-settings", body),
  },
};

// ============================================================
// Leads + nested resources
// ============================================================

export interface LeadRow {
  id: string;
  full_name: string;
  phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  source: string | null;
  campaign_name: string | null;
  courses: string[] | null;
  priority: string;
  child_age: number | null;
  student_class: string | null;
  batch_preference: string | null;
  budget_range: string | null;
  status: string;
  assigned_to: string | null;
  created_by: string | null;
  follow_up_date: string | null;
  follow_up_type: string | null;
  follow_up_reminder_minutes: number | null;
  follow_up_notes: string | null;
  last_activity_at: string | null;
  status_changed_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  course_data: Record<string, unknown> | null;
  monthly_fees: number | null;
  deal_value: number | null;
  won_at: string | null;
  additional_fields: Record<string, unknown> | null;
  lead_score: number | null;
  score_breakdown: Record<string, unknown> | null;
  score_updated_at: string | null;
  activities: LeadActivityRow[] | null;
  lead_notes: LeadNoteRow[] | null;
  payments: SalesPaymentRow[] | null;
  follow_ups: FollowUpRow[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadActivityRow {
  id: string;
  lead_id: string;
  type: string;
  title: string;
  description: string | null;
  outcome?: string | null;
  duration_minutes: number | null;
  meta: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string | null;
  lead?: { id: string; full_name: string } | null;
  rep?: { id: string; full_name: string } | null;
}

export interface LeadNoteRow {
  id: string;
  lead_id: string;
  author_id: string | null;
  body: string;
  attachments?: LeadNoteAttachmentRow[];
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadNoteAttachmentRow {
  id: string;
  note_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
}

export interface SalesPaymentRow {
  id: string;
  lead_id: string;
  amount: number;
  method: string | null;
  paid_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface FollowUpRow {
  id: string;
  lead_id: string;
  assigned_to: string | null;
  created_by: string | null;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  type: string | null;
  notes: string | null;
  reminder_minutes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadIndexQuery {
  status?: string;
  priority?: string;
  source?: string;
  assigned_to?: string;
  search?: string;
  course?: string;
  from?: string;
  to?: string;
  won_from?: string;
  won_to?: string;
  page?: number;
  per_page?: number;
  with?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

export function unwrapList<T>(res: PaginatedResponse<T> | T[] | { data: T[] }): T[] {
  if (Array.isArray(res)) return res;
  const d = (res as { data?: unknown }).data;
  return Array.isArray(d) ? (d as T[]) : [];
}

export const leads = {
  list: (query?: LeadIndexQuery) =>
    salesApi.get<PaginatedResponse<LeadRow> | LeadRow[]>("/api/v1/sales/leads", query as Record<string, string | number | boolean | null | undefined> | undefined),
  listAll: async (query?: Omit<LeadIndexQuery, "page" | "per_page">): Promise<LeadRow[]> => {
    const res = await salesApi.get<PaginatedResponse<LeadRow> | LeadRow[]>(
      "/api/v1/sales/leads",
      { ...(query as Record<string, string | number | boolean | null | undefined>), per_page: 1000 },
    );
    return unwrapList(res);
  },
  show: (id: string, withRels?: string) => getOne<LeadRow>(`/api/v1/sales/leads/${id}${withRels ? `?with=${withRels}` : ""}`),
  create: (body: Partial<LeadRow>) => postOne<LeadRow>("/api/v1/sales/leads", body),
  update: (id: string, body: Partial<LeadRow>) => patchOne<LeadRow>(`/api/v1/sales/leads/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/leads/${id}`),
  bulkRemove: async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map((id) => salesApi.delete<void>(`/api/v1/sales/leads/${id}`)));
  },
  assign: (id: string, salesUserId: string | null) =>
    postOne<LeadRow>(`/api/v1/sales/leads/${id}/assign`, { assigned_to: salesUserId }),
};

export const leadActivities = {
  list: (leadId: string) => listOf<LeadActivityRow>(`/api/v1/sales/leads/${leadId}/activities`),
  listAll: async (query?: { type?: string; created_by?: string; q?: string; from?: string; to?: string; per_page?: number }) => {
    const res = await salesApi.get<PaginatedResponse<LeadActivityRow> | LeadActivityRow[]>(
      "/api/v1/sales/lead-activities",
      { ...(query as Record<string, string | number | boolean | null | undefined>), per_page: query?.per_page ?? 1000 },
    );
    return unwrapList(res);
  },
  listPaginated: (query?: { type?: string; created_by?: string; q?: string; from?: string; to?: string; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<LeadActivityRow> | LeadActivityRow[]>(
      "/api/v1/sales/lead-activities",
      query as Record<string, string | number | boolean | null | undefined> | undefined,
    ),
  create: (leadId: string, body: Partial<LeadActivityRow>) =>
    postOne<LeadActivityRow>(`/api/v1/sales/leads/${leadId}/activities`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/lead-activities/${id}`),
};

export const leadNotes = {
  list: (leadId: string) => listOf<LeadNoteRow>(`/api/v1/sales/leads/${leadId}/notes`),
  create: (leadId: string, body: { body: string }) => postOne<LeadNoteRow>(`/api/v1/sales/leads/${leadId}/notes`, body),
  update: (id: string, body: { body: string }) => patchOne<LeadNoteRow>(`/api/v1/sales/lead-notes/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/lead-notes/${id}`),
  uploadAttachment: (noteId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return postOne<LeadNoteAttachmentRow>(`/api/v1/sales/lead-notes/${noteId}/attachments`, fd);
  },
  removeAttachment: (id: string) => salesApi.delete<void>(`/api/v1/sales/lead-note-attachments/${id}`),
};

export const payments = {
  list: (query?: { lead_id?: string; lead_ids?: readonly string[]; from?: string; to?: string; method?: string; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<SalesPaymentRow> | SalesPaymentRow[]>("/api/v1/sales/payments", query),
  listForLead: (leadId: string) => listOf<SalesPaymentRow>(`/api/v1/sales/leads/${leadId}/payments`),
  create: (leadId: string, body: Partial<SalesPaymentRow>) =>
    postOne<SalesPaymentRow>(`/api/v1/sales/leads/${leadId}/payments`, body),
  update: (id: string, body: Partial<SalesPaymentRow>) => patchOne<SalesPaymentRow>(`/api/v1/sales/payments/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/payments/${id}`),
};

export const followUps = {
  list: (query?: { status?: string; assigned_to?: string; from?: string; to?: string; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<FollowUpRow> | FollowUpRow[]>("/api/v1/sales/follow-ups", query as Record<string, string | number | boolean | null | undefined> | undefined),
  listForLead: (leadId: string) => listOf<FollowUpRow>(`/api/v1/sales/leads/${leadId}/follow-ups`),
  create: (leadId: string, body: Partial<FollowUpRow>) =>
    postOne<FollowUpRow>(`/api/v1/sales/leads/${leadId}/follow-ups`, body),
  update: (id: string, body: Partial<FollowUpRow>) => patchOne<FollowUpRow>(`/api/v1/sales/follow-ups/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/follow-ups/${id}`),
};

// ============================================================
// Expenses + Targets + Audit logs
// ============================================================

export interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string | null;
  paid_to: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SalesTargetRow {
  id: string;
  sales_user_id: string;
  month: string;
  period_type: string;
  target_amount: number;
  created_at: string | null;
}

export interface SalesAuditLogRow {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  table_name: string;
  row_id: string | null;
  changed_fields: string[] | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  lead_id: string | null;
  created_at: string | null;
}

export const expenses = {
  list: (query?: { category?: string; from?: string; to?: string; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<ExpenseRow> | ExpenseRow[]>("/api/v1/sales/expenses", query as Record<string, string | number | boolean | null | undefined> | undefined),
  create: (body: Partial<ExpenseRow>) => postOne<ExpenseRow>("/api/v1/sales/expenses", body),
  update: (id: string, body: Partial<ExpenseRow>) => patchOne<ExpenseRow>(`/api/v1/sales/expenses/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/expenses/${id}`),
};

export const targets = {
  list: (query?: { sales_user_id?: string; month?: string; period_type?: string }) =>
    listOf<SalesTargetRow>("/api/v1/sales/targets", query as Record<string, string | number | boolean | null | undefined>),
  create: (body: Partial<SalesTargetRow>) => postOne<SalesTargetRow>("/api/v1/sales/targets", body),
  update: (id: string, body: Partial<SalesTargetRow>) => patchOne<SalesTargetRow>(`/api/v1/sales/targets/${id}`, body),
  upsert: (body: { sales_user_id: string; month: string; period_type: string; target_amount: number }) =>
    postOne<SalesTargetRow>("/api/v1/sales/targets", body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/targets/${id}`),
};

export const auditLogs = {
  list: (query?: { actor_id?: string; action?: string; table_name?: string; from?: string; to?: string; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<SalesAuditLogRow> | SalesAuditLogRow[]>(
      "/api/v1/sales/audit-logs",
      query as Record<string, string | number | boolean | null | undefined> | undefined,
    ),
};

// ============================================================
// Notifications + per-user prefs
// ============================================================

export interface SalesNotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface SalesNotificationPrefs {
  id: string;
  user_id: string;
  follow_up_reminder_inapp: boolean;
  follow_up_reminder_email: boolean;
  overdue_alert: boolean;
  new_lead_assigned: boolean;
  csv_import_complete: boolean;
  status_changed: boolean;
}

export const notifications = {
  list: (query?: { unread_only?: boolean; page?: number; per_page?: number }) =>
    salesApi.get<PaginatedResponse<SalesNotificationRow> | SalesNotificationRow[]>(
      "/api/v1/sales/notifications",
      query as Record<string, string | number | boolean | null | undefined> | undefined,
    ),
  markRead: (id: string) => salesApi.post<SalesNotificationRow>(`/api/v1/sales/notifications/${id}/read`),
  markAllRead: () => salesApi.post<{ ok: true }>("/api/v1/sales/notifications/read-all"),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/notifications/${id}`),
};

export const notificationPrefs = {
  show: () => getOne<SalesNotificationPrefs>("/api/v1/sales/notification-prefs"),
  update: (body: Partial<SalesNotificationPrefs>) =>
    patchOne<SalesNotificationPrefs>("/api/v1/sales/notification-prefs", body),
};

// ============================================================
// Sales users + role permissions
// ============================================================

export interface SalesUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  default_course_id: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  permissions: string[];
  avatar_url: string | null;
  designation: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SalesRolePermissionRow {
  role: string;
  permissions: string[];
  updated_by: string | null;
}

export interface SalesUserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
  is_active?: boolean;
  phone?: string | null;
  default_course_id?: string | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  permissions?: string[] | null;
  avatar_url?: string | null;
  designation?: string | null;
}

export const salesUsers = {
  list: (query?: { active_only?: boolean; role?: string; search?: string }) =>
    listOf<SalesUserRow>(
      "/api/v1/sales/users",
      query as Record<string, string | number | boolean | null | undefined>,
    ),
  show: (id: string) => getOne<SalesUserRow>(`/api/v1/sales/users/${id}`),
  create: (body: SalesUserCreatePayload) => postOne<SalesUserRow>("/api/v1/sales/users", body),
  update: (id: string, body: Partial<SalesUserCreatePayload>) =>
    patchOne<SalesUserRow>(`/api/v1/sales/users/${id}`, body),
  remove: (id: string) => salesApi.delete<void>(`/api/v1/sales/users/${id}`),
};

export const rolePermissions = {
  list: () => listOf<SalesRolePermissionRow>("/api/v1/sales/role-permissions"),
  show: (role: string) => getOne<SalesRolePermissionRow>(`/api/v1/sales/role-permissions/${role}`),
  create: (body: { role: string; permissions: string[] }) =>
    postOne<SalesRolePermissionRow>("/api/v1/sales/role-permissions", body),
  update: (role: string, body: { permissions: string[] }) =>
    patchOne<SalesRolePermissionRow>(`/api/v1/sales/role-permissions/${role}`, body),
  remove: (role: string) => salesApi.delete<void>(`/api/v1/sales/role-permissions/${role}`),
};

// ============================================================
// Authenticated sales user — self-service profile/password/avatar
// ============================================================

export const auth = {
  updateProfile: (body: { full_name?: string; phone?: string | null; designation?: string | null; avatar_url?: string | null }) =>
    patchOne<SalesUserRow>("/api/v1/sales/auth/profile", body),
  updatePassword: (body: { current_password: string; password: string; password_confirmation: string }) =>
    salesApi.put<{ message: string }>("/api/v1/sales/auth/password", body),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return postOne<SalesUserRow>("/api/v1/sales/auth/avatar", fd);
  },
  removeAvatar: () => salesApi.delete<SalesUserRow>("/api/v1/sales/auth/avatar"),
};
