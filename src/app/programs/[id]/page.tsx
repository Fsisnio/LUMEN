"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import { ArrowLeft, AlertTriangle, Target, Plus, Pencil, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { IndicatorForm } from "@/components/IndicatorForm";
import type { Indicator } from "@/lib/types";

export default function ProgramDetailPage() {
  return (
    <TenantGate>
      <ProgramDetailPageInner />
    </TenantGate>
  );
}

function ProgramDetailPageInner() {
  const params = useParams();
  const programIdParam = typeof params.id === "string" ? params.id : "";
  const { data, loading, error, refetch } = useData();
  const { formatCurrency } = useLocale();
  const { apiFetch } = useTenant();
  const programs = data?.programs ?? [];
  const projects = data?.projects ?? [];
  const indicators = data?.indicators ?? [];

  const program = programs.find((p) => p.id === programIdParam);
  const programProjects = projects.filter((p) => p.programId === programIdParam);

  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [indicatorEditing, setIndicatorEditing] = useState<Indicator | null>(null);

  const programIndicators = indicators.filter((i) => i.programId === programIdParam);
  const programIdsOpts = programs.map((p) => ({ id: p.id, name: p.name }));

  const handleSaveIndicator = useCallback(
    async (formData: Partial<Indicator>) => {
      const payload =
        formData.projectId == null &&
        formData.programId == null &&
        !indicatorEditing
          ? { ...formData, programId: program?.id, projectId: undefined }
          : formData;

      if (indicatorEditing) {
        await apiFetch(`/api/indicators/${indicatorEditing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/indicators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      refetch();
      setIndicatorOpen(false);
      setIndicatorEditing(null);
    },
    [program?.id, indicatorEditing, refetch, apiFetch]
  );

  const handleDeleteIndicator = useCallback(
    async (ind: Indicator) => {
      if (!confirm(`Delete indicator « ${ind.name} »?`)) return;
      await apiFetch(`/api/indicators/${ind.id}`, { method: "DELETE" });
      refetch();
    },
    [refetch, apiFetch]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-rose-600">Error: {error}</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Program not found</p>
      </div>
    );
  }

  const donorBreakdown = programProjects.reduce((acc, p) => {
    acc[p.donor] = (acc[p.donor] || 0) + p.budget;
    return acc;
  }, {} as Record<string, number>);
  const donorData = Object.entries(donorBreakdown).map(([name, value]) => ({
    name,
    value: value / 1000,
  }));
  const totalBeneficiaries = programProjects.reduce((s, p) => s + p.beneficiaries, 0);
  const projectIndicatorsAggregated = indicators
    .filter((i) => i.projectId && programProjects.some((p) => p.id === i.projectId))
    .reduce((acc, ind) => {
      const key = `${ind.name}|${ind.unit}`;
      if (!acc[key]) acc[key] = { name: ind.name, unit: ind.unit, target: 0, actual: 0 };
      acc[key].target += ind.target;
      acc[key].actual += ind.actual;
      return acc;
    }, {} as Record<string, { name: string; unit: string; target: number; actual: number }>);
  const avgProgress =
    programProjects.length > 0
      ? Math.round(
          programProjects.reduce((s, p) => s + p.progress, 0) / programProjects.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <Link
          href="/programs"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[var(--navy)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Programs
        </Link>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl text-[var(--navy)]">
          {program.name}
        </h1>
        <p className="mt-1 text-gray-600">Program-level dashboard</p>
        {program.description?.trim() && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">{program.description}</p>
        )}
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* KPI Row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Active Projects</p>
            <p className="mt-1 font-display text-2xl font-semibold">{program.activeProjects}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Budget</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {formatCurrency(program.totalBudget, true)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Burn Rate</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {Math.round((program.spentBudget / program.totalBudget) * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Avg. Progress</p>
            <p className="mt-1 font-display text-2xl font-semibold">{avgProgress}%</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Beneficiaries</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {totalBeneficiaries.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Donor Breakdown
            </h3>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donorData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => formatCurrency((v as number) * 1000, true)} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v != null ? formatCurrency((v as number) * 1000, true) : "", "Budget"]} />
                  <Bar dataKey="value" fill="#c9a227" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
                <Target className="h-5 w-5" /> Program Indicators
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIndicatorEditing(null);
                  setIndicatorOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--accent)] px-2 py-1 text-sm font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)]/10"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {(programIndicators.length > 0 || Object.keys(projectIndicatorsAggregated).length > 0) ? (
              <div className="mt-4 space-y-3">
                {programIndicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{ind.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{
                              width: `${Math.min((ind.actual / ind.target) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-gray-600">
                          {ind.actual.toLocaleString("en-US")} / {ind.target.toLocaleString("en-US")}{" "}
                          {ind.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIndicatorEditing(ind);
                          setIndicatorOpen(true);
                        }}
                        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                        aria-label="Edit indicator"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIndicator(ind)}
                        className="rounded p-1.5 text-gray-600 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete indicator"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {Object.values(projectIndicatorsAggregated).map((ind, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] border-dashed p-3">
                    <p className="text-sm font-medium text-gray-600">{ind.name} <span className="text-xs">(from projects)</span></p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-[var(--navy)]/60"
                          style={{ width: `${Math.min((ind.actual / ind.target) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {ind.actual.toLocaleString("en-US")} / {ind.target.toLocaleString("en-US")} {ind.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No indicators defined for this program.</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Risk Summary
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
                  program.riskLevel === "high"
                    ? "bg-rose-100"
                    : program.riskLevel === "medium"
                    ? "bg-amber-100"
                    : "bg-emerald-100"
                }`}
              >
                <AlertTriangle
                  className={`h-8 w-8 ${
                    program.riskLevel === "high"
                      ? "text-rose-600"
                      : program.riskLevel === "medium"
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-semibold capitalize">{program.riskLevel} Risk Level</p>
                <p className="text-sm text-gray-500">
                  {programProjects.filter((p) => p.riskLevel === "high" || p.riskLevel === "critical").length}{" "}
                  high-risk projects in this program
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-display text-lg font-semibold text-[var(--navy)]">
            Projects in {program.name}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Donor</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Budget</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Progress</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">Indicators</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Risk</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {programProjects.map((project) => (
                  <tr key={project.id} className="border-b border-[var(--border)]/50 last:border-0">
                    <td className="px-6 py-3 font-mono text-sm">{project.code}</td>
                    <td className="px-6 py-3 font-medium">{project.title}</td>
                    <td className="px-6 py-3 text-gray-600">{project.donor}</td>
                    <td className="px-6 py-3 text-right">{formatCurrency(project.budget, true)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {indicators.filter((i) => i.projectId === project.id).length}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          project.riskLevel === "high"
                            ? "bg-rose-100 text-rose-700"
                            : project.riskLevel === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {project.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-[var(--accent-dark)] hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {indicatorOpen && program && (
        <Modal
          title={indicatorEditing ? "Edit indicator" : "Add program indicator"}
          onClose={() => {
            setIndicatorOpen(false);
            setIndicatorEditing(null);
          }}
        >
          <IndicatorForm
            key={indicatorEditing?.id ?? `new-${program.id}`}
            indicator={indicatorEditing}
            projectIds={programProjects.map((p) => ({ id: p.id, title: p.title }))}
            programIds={programIdsOpts}
            defaultProgramId={program.id}
            defaultScope="program"
            onSave={handleSaveIndicator}
            onCancel={() => {
              setIndicatorOpen(false);
              setIndicatorEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
