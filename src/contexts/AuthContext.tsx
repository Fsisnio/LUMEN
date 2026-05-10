"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Organization, PublicUser } from "@/lib/types";

interface SignupPayload {
  user: { name: string; email: string; password: string };
  organization: Omit<Organization, "id">;
}

interface AuthContextValue {
  user: PublicUser | null;
  tenant: Organization | null;
  /** True while we are still resolving the initial /api/auth/me call. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignupPayload) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch the current session (e.g. after editing the org). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [tenant, setTenant] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setTenant(null);
        return;
      }
      const body = (await res.json()) as {
        user: PublicUser | null;
        tenant: Organization | null;
      };
      setUser(body.user);
      setTenant(body.tenant);
    } catch {
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const body = (await res.json()) as {
        user: PublicUser;
        tenant: Organization | null;
      };
      setUser(body.user);
      setTenant(body.tenant);
    },
    []
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(async (payload) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readError(res));
    const body = (await res.json()) as {
      user: PublicUser;
      tenant: Organization | null;
    };
    setUser(body.user);
    setTenant(body.tenant);
  }, []);

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTenant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
