"use client";

/**
 * After auth was added, the tenant is **always** the authenticated user's
 * organization — the server enforces it from the session cookie. This module
 * keeps the legacy `useTenant()` API used across the app and just derives its
 * values from `useAuth()`.
 *
 * The previous tenant-switcher UX is gone: a user belongs to a single
 * organization, so there is nothing to switch. `setTenantId` is a no-op kept
 * for backwards source compatibility.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Organization } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface TenantContextValue {
  tenants: Organization[];
  tenant: Organization | null;
  tenantId: string | null;
  ready: boolean;
  setTenantId: (id: string | null) => void;
  refreshTenants: () => Promise<void>;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenant, loading, refresh } = useAuth();

  const apiFetch = useCallback<TenantContextValue["apiFetch"]>((input, init) => {
    return fetch(input, {
      credentials: "same-origin",
      ...init,
    });
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants: tenant ? [tenant] : [],
      tenant,
      tenantId: tenant?.id ?? null,
      ready: !loading,
      setTenantId: () => {
        // Intentionally a no-op now. Tenant is bound to the session.
      },
      refreshTenants: refresh,
      apiFetch,
    }),
    [tenant, loading, refresh, apiFetch]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
