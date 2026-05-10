"use client";

import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { TenantGate } from "@/components/TenantGate";
import { Shield, AlertTriangle, FileCheck, ClipboardList } from "lucide-react";

export default function RiskPage() {
  return (
    <TenantGate>
      <RiskPageInner />
    </TenantGate>
  );
}

function RiskPageInner() {
  const { data, loading, error } = useData();
  const { t } = useLocale();
  const risks = data?.risks ?? [];
  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];

  const riskByLevel = risks.reduce(
    (acc, r) => {
      acc[r.level] = (acc[r.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const projectRisks = risks.map((r) => {
    const project = projects.find((p) => p.id === r.projectId);
    const program = project ? programs.find((p) => p.id === project.programId) : null;
    return { ...r, project, program };
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-rose-600">{t("common.error")}: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">
          {t("risk.title")}
        </h1>
        <p className="mt-1 text-gray-600">
          {t("risk.subtitle")}
        </p>
      </header>

      <div className="p-8">
        {/* Summary */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Risks</p>
            <p className="mt-1 font-display text-2xl font-semibold">{risks.length}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
            <p className="text-sm text-rose-700">High / Critical</p>
            <p className="mt-1 font-display text-2xl font-semibold text-rose-700">
              {riskByLevel.high || 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
            <p className="text-sm text-amber-700">Medium</p>
            <p className="mt-1 font-display text-2xl font-semibold text-amber-700">
              {riskByLevel.medium || 0}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
            <p className="text-sm text-emerald-700">Mitigated</p>
            <p className="mt-1 font-display text-2xl font-semibold text-emerald-700">
              {risks.filter((r) => r.status === "mitigated").length}
            </p>
          </div>
        </div>

        {/* Risk Register */}
        <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <h3 className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-4 font-display text-lg font-semibold text-[var(--navy)]">
            <ClipboardList className="h-5 w-5" /> Risk Register by Project
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Project</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Risk Description</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">Level</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {projectRisks.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]/50 last:border-0">
                    <td className="px-6 py-3">
                      <p className="font-medium">{r.project?.title}</p>
                      <p className="text-xs text-gray-500">{r.program?.name}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{r.description}</td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-medium ${
                          r.level === "high"
                            ? "bg-rose-100 text-rose-700"
                            : r.level === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {r.level}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-medium ${
                          r.status === "mitigated"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "closed"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{r.mitigation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
              <FileCheck className="h-5 w-5" /> Compliance Checklist
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Donor requirements, audit readiness, document validation workflow.
            </p>
            <ul className="mt-4 space-y-2">
              {["Donor reporting deadlines", "Audit trail completeness", "Procurement documentation", "Beneficiary verification"].map(
                (item, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
              <Shield className="h-5 w-5" /> Governance & Data Security
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Role-based access control</li>
              <li>• Data backup & recovery</li>
              <li>• Donor confidentiality controls</li>
              <li>• Activity logs & audit trail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
