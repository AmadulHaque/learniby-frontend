import { ApiError, type ApiErrorBody } from "./types";
import { clearToken, getToken, setToken, type AuthPool } from "./storage";

const DEFAULT_BASE_URL = "http://localhost:5000";

function envBaseUrl(): string {
  // Vite injects VITE_* into import.meta.env at build time.
  // Cast through unknown because import.meta.env shape varies between environments.
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  return meta.env?.VITE_API_URL || DEFAULT_BASE_URL;
}

export function apiBaseUrl(): string {
  return envBaseUrl().replace(/\/$/, "");
}

function refreshPathFor(pool: AuthPool): string {
  return pool === "user" ? "/api/v1/auth/refresh" : "/api/v1/sales/auth/refresh";
}

interface RawRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined | readonly (string | number)[]>;
  signal?: AbortSignal;
  // Skip Authorization header injection — used by login/refresh endpoints.
  skipAuth?: boolean;
  // Skip the 401→refresh-then-retry path — used by refresh itself and by `me`
  // when we want a single attempt only.
  skipRefreshOnUnauthorized?: boolean;
}

function buildUrl(path: string, query?: RawRequestOptions["query"]): string {
  const base = apiBaseUrl();
  const full = path.startsWith("http") ? path : base + (path.startsWith("/") ? path : "/" + path);
  if (!query) return full;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === null || item === undefined) continue;
        params.append(`${k}[]`, String(item));
      }
      continue;
    }
    params.append(k, String(v));
  }
  const qs = params.toString();
  if (!qs) return full;
  return full + (full.includes("?") ? "&" : "?") + qs;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface RefreshResponse {
  access_token: string;
  expires_at: string;
}

// In-flight refresh dedupe — many parallel 401s should trigger only one refresh.
const refreshInFlight: Record<AuthPool, Promise<string | null> | null> = {
  user: null,
  sales: null,
};

async function performRefresh(pool: AuthPool): Promise<string | null> {
  if (refreshInFlight[pool]) return refreshInFlight[pool];

  refreshInFlight[pool] = (async () => {
    try {
      const res = await fetch(buildUrl(refreshPathFor(pool)), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const body = (await parseJsonSafe(res)) as RefreshResponse | null;
      if (!body || !body.access_token || !body.expires_at) return null;
      setToken(pool, body.access_token, body.expires_at);
      return body.access_token;
    } catch {
      return null;
    } finally {
      // Free the slot once this attempt resolves.
      setTimeout(() => {
        refreshInFlight[pool] = null;
      }, 0);
    }
  })();

  return refreshInFlight[pool];
}

async function rawRequest<TResult>(
  pool: AuthPool,
  path: string,
  opts: RawRequestOptions,
): Promise<TResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!opts.skipAuth) {
    const token = getToken(pool);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    signal: opts.signal,
  };
  if (opts.body !== undefined) {
    init.body = isFormData ? (opts.body as FormData) : JSON.stringify(opts.body);
  }

  const url = buildUrl(path, opts.query);
  let res = await fetch(url, init);

  if (res.status === 401 && !opts.skipRefreshOnUnauthorized && !opts.skipAuth) {
    const newToken = await performRefresh(pool);
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...init, headers });
    } else {
      clearToken(pool);
    }
  }

  if (!res.ok) {
    const body = (await parseJsonSafe(res)) as ApiErrorBody | null;
    const message = (body && typeof body === "object" && body.message) || res.statusText || "Request failed";
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as TResult;
  return (await parseJsonSafe(res)) as TResult;
}

export interface ApiClient {
  get<T>(path: string, query?: RawRequestOptions["query"]): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: Partial<RawRequestOptions>): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  raw<T>(path: string, opts: RawRequestOptions): Promise<T>;
}

function makeClient(pool: AuthPool): ApiClient {
  return {
    get: (path, query) => rawRequest(pool, path, { method: "GET", query }),
    post: (path, body, opts) => rawRequest(pool, path, { method: "POST", body, ...(opts ?? {}) }),
    patch: (path, body) => rawRequest(pool, path, { method: "PATCH", body }),
    put: (path, body) => rawRequest(pool, path, { method: "PUT", body }),
    delete: (path) => rawRequest(pool, path, { method: "DELETE" }),
    raw: (path, opts) => rawRequest(pool, path, opts),
  };
}

export const userApi = makeClient("user");
export const salesApi = makeClient("sales");

export { ApiError } from "./types";
export { clearToken, getToken, setToken } from "./storage";
export type { AuthPool } from "./storage";
