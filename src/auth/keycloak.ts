import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "https://keycloak.127.0.0.1.nip.io",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "hidris",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT ?? "hidris-frontend",
});

/** Bearer header for manual fetch calls (kept for compatibility). */
export function authHeader(): Record<string, string> {
  return keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : {};
}

/**
 * fetch wrapper that guarantees a fresh token and attaches the bearer header.
 * Refreshes if the token has < 30s left; redirects to login if refresh fails.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.login();
    // login() navigates away; this rejection just unblocks callers meanwhile.
    return Promise.reject(new Error("Session expired — redirecting to login"));
  }

  const headers = new Headers(init.headers);
  if (keycloak.token) headers.set("Authorization", `Bearer ${keycloak.token}`);
  return fetch(input, { ...init, headers });
}

/**
 * EventSource cannot send an Authorization header, so the SSE endpoint
 * authenticates via a short-lived access_token query param instead.
 * Always refresh first so the token is valid for the life of the stream.
 */
export async function sseUrlWithToken(url: string): Promise<string> {
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.login();
    throw new Error("Session expired — redirecting to login");
  }
  const u = new URL(url);
  if (keycloak.token) u.searchParams.set("access_token", keycloak.token);
  return u.toString();
}
