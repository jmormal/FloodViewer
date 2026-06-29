import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "https://keycloak.127.0.0.1.nip.io",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "hidris",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT ?? "hidris-frontend",
});

// Optional: expose the token getter for fetch calls
export function authHeader(): Record<string, string> {
  return keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : {};
}
