import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { keycloak } from "./keycloak";

interface AuthState {
  authenticated: boolean;
  username: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const didInit = useRef(false); // guard against React 18 StrictMode double-mount

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    keycloak
      .init({
        onLoad: "login-required",     // forces login before app renders
        pkceMethod: "S256",
        checkLoginIframe: false,      // avoids 3rd-party-cookie / iframe issues on nip.io
      })
      .then((auth) => {
        setAuthenticated(auth);
        setReady(true);
      })
      .catch((e) => {
        console.error("Keycloak init failed:", e);
        setReady(true);
      });
  }, []);

  // Refresh the token before it expires
  useEffect(() => {
    if (!authenticated) return;
    const id = setInterval(() => {
      keycloak.updateToken(60).catch(() => keycloak.login());
    }, 30_000);
    return () => clearInterval(id);
  }, [authenticated]);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-5 bg-[#0a0e17]">
        <div className="h-12 w-12 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
        <p className="font-mono text-sm text-dim">Authenticating…</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        username:
          (keycloak.tokenParsed as any)?.preferred_username ?? null,
        logout: () =>
          keycloak.logout({ redirectUri: window.location.origin }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
