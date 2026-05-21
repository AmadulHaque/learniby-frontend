/**
 * Teacher panel API client — typed wrappers for batches, batch teachers, and
 * class sessions endpoints under /api/v1/*.
 *
 * Scope:
 *  - Teachers can list/manage class sessions for batches they're assigned to.
 *  - Admin/manager can list/manage all batches and teacher assignments.
 *  - Backend resources set `$wrap = null`; controllers return collections via
 *    `Resource::collection(...)` which Laravel wraps as `{ data: [...] }`.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface Collection<T> {
  data: T[];
}

export interface BatchRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  teachers?: { id: string; email: string; full_name: string | null }[];
  teachers_count?: number;
  sessions_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClassSessionRow {
  id: string;
  batch_id: string;
  title: string;
  description: string | null;
  meeting_link: string;
  scheduled_at: string;
  duration_min: number;
  added_by: string | null;
  batch?: { id: string; name: string };
  created_at: string | null;
  updated_at: string | null;
}

export interface BatchTeacherRow {
  id: string;
  email: string;
  full_name: string | null;
}

export interface BatchListParams {
  scope?: "all" | "mine";
  with_teachers?: boolean;
}

export const Batches = {
  list: (params: BatchListParams = {}) =>
    apiGet<Collection<BatchRow>>("/batches", {
      scope: params.scope,
      with_teachers: params.with_teachers ? 1 : undefined,
    }),
  show: (id: string) => apiGet<BatchRow>(`/batches/${id}`),
  create: (payload: { name: string; description?: string | null }) =>
    apiPost<BatchRow>("/batches", payload),
  update: (
    id: string,
    payload: { name?: string; description?: string | null },
  ) => apiPatch<BatchRow>(`/batches/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/batches/${id}`),
};

export const BatchTeachers = {
  list: (batchId: string) =>
    apiGet<Collection<BatchTeacherRow>>(`/batches/${batchId}/teachers`),
  assign: (batchId: string, userId: string) =>
    apiPost<{ data: { batch_id: string; user_id: string } }>(
      `/batches/${batchId}/teachers`,
      { user_id: userId },
    ),
  unassign: (batchId: string, userId: string) =>
    apiDelete<void>(`/batches/${batchId}/teachers/${userId}`),
};

export interface ClassSessionListParams {
  scope?: "all" | "mine";
  batch_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  direction?: "asc" | "desc";
}

export interface ClassSessionInput {
  batch_id: string;
  title: string;
  description?: string | null;
  meeting_link: string;
  scheduled_at: string;
  duration_min?: number;
}

export const ClassSessions = {
  list: (params: ClassSessionListParams = {}) =>
    apiGet<Collection<ClassSessionRow>>("/class-sessions", {
      scope: params.scope,
      batch_id: params.batch_id,
      from: params.from,
      to: params.to,
      limit: params.limit,
      direction: params.direction,
    }),
  create: (payload: ClassSessionInput) =>
    apiPost<ClassSessionRow>("/class-sessions", payload),
  update: (id: string, payload: Partial<ClassSessionInput>) =>
    apiPatch<ClassSessionRow>(`/class-sessions/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/class-sessions/${id}`),
};
