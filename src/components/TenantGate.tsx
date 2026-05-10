"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { ReactNode } from "react";

/**
 * Wraps a page so it only renders once a tenant is selected. Otherwise it
 * displays a friendly prompt directing the user to pick or create one.
 */
export function TenantGate({ children }: { children: ReactNode }) {
  const { tenant, ready, tenants } = useTenant();
  const { t } = useLocale();

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-8">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent-dark)]">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-[var(--navy)]">
            {t("tenant.gateTitle")}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{t("tenant.gateBody")}</p>
          <div className="mt-6">
            <Link
              href="/organizations"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-dark)]"
            >
              <Building2 className="h-4 w-4" />
              {tenants.length === 0 ? t("organizations.add") : t("tenant.manage")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
