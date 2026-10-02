import type {
  AccountOrdersResponse,
  AccountUser,
  AuthResponse,
  ClaimOrdersResponse,
  MeResponse,
  SavedAddress,
} from "@/lib/api-types";
import { getOrderRefs, request } from "@/lib/order-client";

// Browser side of the account API. The session lives in an HttpOnly cookie the
// page can't read; these calls just send it (same-origin fetch includes cookies).

const JSON_HEADERS = { "Content-Type": "application/json" };

function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method,
    credentials: "same-origin",
    ...(body === undefined ? {} : { headers: JSON_HEADERS, body: JSON.stringify(body) }),
  });
}

export const fetchMe = (signal?: AbortSignal) =>
  request<MeResponse>("/api/auth/me", { method: "GET", credentials: "same-origin", signal });

export const signUp = (body: { email: string; password: string; name?: string }) =>
  send<AuthResponse>("/api/auth/signup", "POST", body);

export const logIn = (body: { email: string; password: string }) => send<AuthResponse>("/api/auth/login", "POST", body);

export const logOut = (everywhere = false) =>
  send<{ ok: true }>("/api/auth/logout", "POST", everywhere ? { everywhere: true } : undefined);

export const updateProfile = (body: { name?: string; phone?: string }) =>
  send<{ user: AccountUser }>("/api/account", "PATCH", body);

export const saveAddress = (body: SavedAddress) =>
  send<{ address: SavedAddress }>("/api/account/address", "PUT", body);

export const changePassword = (currentPassword: string, newPassword: string) =>
  send<{ ok: true }>("/api/account/password", "POST", { currentPassword, newPassword });

export const deleteAccount = (password: string) => send<{ deleted: true }>("/api/account", "DELETE", { password });

export const fetchAccountOrders = (signal?: AbortSignal) =>
  request<AccountOrdersResponse>("/api/account/orders", { method: "GET", credentials: "same-origin", signal });

/** Links the guest orders this device placed (by tracking token) to the account. Best effort. */
export async function claimDeviceOrders(): Promise<number> {
  const refs = getOrderRefs().map(({ orderId, trackingToken }) => ({ orderId, trackingToken }));
  if (refs.length === 0) return 0;
  try {
    return (await send<ClaimOrdersResponse>("/api/account/claim-orders", "POST", refs.slice(0, 50))).claimed;
  } catch {
    return 0;
  }
}

export const forgetAddress = () => send<{ address: null }>("/api/account/address", "DELETE");
