import { salesApi, userApi } from "./client";
import { clearToken, setToken } from "./storage";
import type { ApiSalesUser, ApiUser, LoginResponse } from "./types";

export async function userLogin(email: string, password: string): Promise<LoginResponse<ApiUser>> {
  const body = await userApi.post<LoginResponse<ApiUser>>(
    "/api/v1/auth/login",
    { email, password },
    { skipAuth: true, skipRefreshOnUnauthorized: true },
  );
  setToken("user", body.access_token, body.expires_at);
  return body;
}

export async function userMe(): Promise<ApiUser> {
  return userApi.get<ApiUser>("/api/v1/auth/me");
}

export async function userLogout(): Promise<void> {
  try {
    await userApi.post<{ message: string }>("/api/v1/auth/logout");
  } finally {
    clearToken("user");
  }
}

export async function salesLogin(
  email: string,
  password: string,
  remember = false,
): Promise<LoginResponse<ApiSalesUser>> {
  const body = await salesApi.post<LoginResponse<ApiSalesUser>>(
    "/api/v1/sales/auth/login",
    { email, password, remember },
    { skipAuth: true, skipRefreshOnUnauthorized: true },
  );
  setToken("sales", body.access_token, body.expires_at);
  return body;
}

export async function salesMe(): Promise<ApiSalesUser> {
  return salesApi.get<ApiSalesUser>("/api/v1/sales/auth/me");
}

export async function salesLogout(): Promise<void> {
  try {
    await salesApi.post<{ message: string }>("/api/v1/sales/auth/logout");
  } finally {
    clearToken("sales");
  }
}
