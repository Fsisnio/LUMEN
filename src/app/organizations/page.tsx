"use client";

import { useState, useCallback } from "react";
import { Pencil, Globe2, Building2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/hooks/use-data";
import { TenantGate } from "@/components/TenantGate";
import { OrganizationForm } from "@/components/OrganizationForm";
import { Modal } from "@/components/Modal";
import type { Organization } from "@/lib/types";

/**
 * Now that each user is bound to a single organization, this page becomes a
 * read/edit view of "my organization". No cross-tenant listing.
 */
export default function OrganizationsPage() {
  return (
    <TenantGate>
      <OrganizationsPageInner />
    </TenantGate>
  );
}

function OrganizationsPageInner() {
  const { t } = useLocale();
  const { tenant, refresh } = useAuth();
  const { data } = useData();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programs = data?.programs ?? [];
  const projects = data?.projects ?? [];

  const handleSave = useCallback(
    async (formData: Partial<Organization>) => {
      if (!tenant) return;
      setError(null);
      const res = await fetch(`/api/organizations/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Update failed.");
        return;
      }
      await refresh();
      setEditing(false);
    },
    [tenant, refresh]
  );

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)] sm:text-3xl">
          {t("organizations.title")}
        </h1>
        <p className="mt-1 text-gray-600">{t("organizations.myOrgSubtitle")}</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <header className="flex flex-col gap-3 border-b border-[var(--border)] bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent-dark)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-[var(--navy)]">
                  {tenant.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Globe2 className="h-3 w-3" /> {tenant.country}
                  <span className="text-gray-300">·</span>
                  {tenant.type}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)]/10 sm:w-auto"
            >
              <Pencil className="h-4 w-4" /> {t("common.edit")}
            </button>
          </header>

          <dl className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{tenant.type}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("organizations.country")}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{tenant.country}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Region</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{tenant.region ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Diocese</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{tenant.diocese ?? "—"}</dd>
            </div>
          </dl>

          <footer className="grid gap-4 border-t border-[var(--border)] bg-gray-50 p-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("nav.programs")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">
                {programs.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("nav.projects")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">
                {projects.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("dashboard.beneficiaries")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">
                {projects.reduce((s, p) => s + p.beneficiaries, 0).toLocaleString("en-US")}
              </p>
            </div>
          </footer>
        </div>
      </div>

      {editing && (
        <Modal title={t("organizations.edit")} onClose={() => setEditing(false)}>
          <OrganizationForm
            organization={tenant}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  );
}
