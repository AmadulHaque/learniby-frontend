const RAW_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "https://admin.learniby.com/api/v1";
export const API_BASE_URL: string = String(RAW_BASE).replace(/\/+$/, "");

const ACCESS_KEY = "learniby.access_token";
const ACCESS_EXP_KEY = "learniby.access_expires_at";
const AUDIENCE_KEY = "learniby.audience";

export type Audience = "user" | "sales";

type Listener = () => void;
const listeners = new Set<Listener>();

function readLs(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function writeLs(key: string, val: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (val == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

let accessToken: string | null = readLs(ACCESS_KEY);
let accessExpiresAt: string | null = readLs(ACCESS_EXP_KEY);
let audience: Audience | null = (readLs(AUDIENCE_KEY) as Audience | null) ?? null;

export const tokenStore = {
  get token() {
    return accessToken;
  },
  get expiresAt() {
    return accessExpiresAt;
  },
  get audience(): Audience | null {
    return audience;
  },
  set(next: { accessToken: string; expiresAt: string; audience: Audience }) {
    accessToken = next.accessToken;
    accessExpiresAt = next.expiresAt;
    audience = next.audience;
    writeLs(ACCESS_KEY, accessToken);
    writeLs(ACCESS_EXP_KEY, accessExpiresAt);
    writeLs(AUDIENCE_KEY, audience);
    listeners.forEach((fn) => fn());
  },
  clear() {
    accessToken = null;
    accessExpiresAt = null;
    audience = null;
    writeLs(ACCESS_KEY, null);
    writeLs(ACCESS_EXP_KEY, null);
    writeLs(AUDIENCE_KEY, null);
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export class ApiError extends Error {
  status: number;
  payload: unknown;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    if (payload && typeof payload === "object" && "errors" in (payload as any)) {
      this.errors = (payload as any).errors;
    }
  }
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  formData?: FormData;
  audience?: Audience;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

function buildUrl(path: string, query?: ApiRequest["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(aud: Audience): Promise<boolean> {
  const path = aud === "sales" ? "/sales/auth/refresh" : "/auth/refresh";
  try {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string; expires_at: string };
    tokenStore.set({ accessToken: data.access_token, expiresAt: data.expires_at, audience: aud });
    return true;
  } catch {
    return false;
  }
}

function ensureRefresh(aud: Audience): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh(aud).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function rawRequest<T>(req: ApiRequest): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!req.skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (req.formData) {
    body = req.formData;
  } else if (req.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.body);
  }

  const res = await fetch(buildUrl(req.path, req.query), {
    method: req.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (data as any)?.message || res.statusText || "Request failed";
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export async function api<T = unknown>(req: ApiRequest): Promise<T> {
  try {
    return await rawRequest<T>(req);
  } catch (e) {
    if (
      e instanceof ApiError &&
      e.status === 401 &&
      !req.skipRefresh &&
      !req.skipAuth &&
      (req.audience ?? audience)
    ) {
      const aud = (req.audience ?? audience) as Audience;
      const ok = await ensureRefresh(aud);
      if (ok) {
        return await rawRequest<T>({ ...req, skipRefresh: true });
      }
      tokenStore.clear();
    }
    throw e;
  }
}

export const apiGet = <T>(path: string, query?: ApiRequest["query"]) =>
  api<T>({ method: "GET", path, query });
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>({ method: "POST", path, body });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>({ method: "PATCH", path, body });
export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>({ method: "PUT", path, body });
export const apiDelete = <T>(path: string, body?: unknown) =>
  api<T>({ method: "DELETE", path, body });
