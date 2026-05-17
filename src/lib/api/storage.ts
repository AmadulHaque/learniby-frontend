// Two separate auth pools (user vs sales) — keep tokens isolated so
// signing into sales doesn't clobber a logged-in student session, and vice versa.

const USER_KEY = "learniby.user.access_token";
const USER_EXP_KEY = "learniby.user.expires_at";
const SALES_KEY = "learniby.sales.access_token";
const SALES_EXP_KEY = "learniby.sales.expires_at";

export type AuthPool = "user" | "sales";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function keysFor(pool: AuthPool): { token: string; exp: string } {
  return pool === "user"
    ? { token: USER_KEY, exp: USER_EXP_KEY }
    : { token: SALES_KEY, exp: SALES_EXP_KEY };
}

export function getToken(pool: AuthPool): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(keysFor(pool).token);
}

export function setToken(pool: AuthPool, token: string, expiresAt: string): void {
  if (!isBrowser()) return;
  const k = keysFor(pool);
  window.localStorage.setItem(k.token, token);
  window.localStorage.setItem(k.exp, expiresAt);
}

export function clearToken(pool: AuthPool): void {
  if (!isBrowser()) return;
  const k = keysFor(pool);
  window.localStorage.removeItem(k.token);
  window.localStorage.removeItem(k.exp);
}

export function getExpiresAt(pool: AuthPool): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(keysFor(pool).exp);
}
