"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Target,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { IndicatorForm } from "@/components/IndicatorForm";
import { ProjectForm } from "@/components/ProjectForm";
import { BudgetLineForm } from "@/components/BudgetLineForm";
import { RiskForm } from "@/components/RiskForm";
import type { Indicator, BudgetLine, RiskItem, Project } from "@/lib/types";

export default function ProjectDetailPage() {
  return (
    <TenantGate>
      <ProjectDetailPageInner />
    </TenantGate>
  );
}

function ProjectDetailPageInner() {
  const params = useParams();
  const projectIdParam = typeof params.id === "string" ? params.id : "";
  const { data, loading, error, refetch } = useData();
  const { formatCurrency } = useLocale();
  const { apiFetch } = useTenant();
  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];
  const indicators = data?.indicators ?? [];
  const budgetLines = data?.budgetLines ?? [];
  const risks = data?.risks ?? [];

  const project = projects.find((p) => p.id === projectIdParam);
  const program = project ? programs.find((p) => p.id === project.programId) : null;
  const projectIndicators = indicators.filter((i) => i.projectId === projectIdParam);
  const projectBudgetLines = budgetLines.filter((b) => b.projectId === projectIdParam);
  const projectRisks = risks.filter((r) => r.projectId === projectIdParam);

  const programIdsOpts = programs.map((p) => ({ id: p.id, name: p.name }));

  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [indicatorEditing, setIndicatorEditing] = useState<Indicator | null>(null);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [budgetModal, setBudgetModal] = useState<BudgetLine | "new" | null>(null);
  const [riskModal, setRiskModal] = useState<RiskItem | "new" | null>(null);

  const openAddIndicator = useCallback(() => {
    setIndicatorEditing(null);
    setIndicatorOpen(true);
  }, []);

  const handleSaveIndicator = useCallback(
    async (formData: Partial<Indicator>) => {
      const payload =
        formData.projectId == null &&
        formData.programId == null &&
        !indicatorEditing
          ? { ...formData, projectId: project?.id, programId: undefined }
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
    [project?.id, indicatorEditing, refetch, apiFetch]
  );

  const handleDeleteIndicator = useCallback(
    async (ind: Indicator) => {
      if (!confirm(`Delete indicator « ${ind.name} »?`)) return;
      await apiFetch(`/api/indicators/${ind.id}`, { method: "DELETE" });
      refetch();
    },
    [refetch, apiFetch]
  );

  const handleSaveProject = useCallback(
    async (formData: Partial<Project>) => {
      if (!project) return;
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      refetch();
      setProjectEditOpen(false);
    },
    [project, refetch, apiFetch]
  );

  const handleSaveBudget = useCallback(
    async (formData: Partial<BudgetLine>) => {
      if (!project) return;
      if (budgetModal === "new") {
        await apiFetch("/api/budget-lines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, projectId: project.id }),
        });
      } else if (budgetModal && typeof budgetModal === "object" && "id" in budgetModal) {
        await apiFetch(`/api/budget-lines/${budgetModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      refetch();
      setBudgetModal(null);
    },
    [project, budgetModal, refetch, apiFetch]
  );

  const handleDeleteBudget = useCallback(
    async (bl: BudgetLine) => {
      if (!confirm(`Delete budget line « ${bl.category} »?`)) return;
      await apiFetch(`/api/budget-lines/${bl.id}`, { method: "DELETE" });
      refetch();
    },
    [refetch, apiFetch]
  );

  const handleSaveRisk = useCallback(
    async (formData: Partial<RiskItem>) => {
      if (!project) return;
      if (riskModal === "new") {
        await apiFetch("/api/risks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, projectId: project.id }),
        });
      } else if (riskModal && typeof riskModal === "object" && "id" in riskModal) {
        await apiFetch(`/api/risks/${riskModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      refetch();
      setRiskModal(null);
    },
    [project, riskModal, refetch, apiFetch]
  );

  const handleDeleteRisk = useCallback(
    async (r: RiskItem) => {
      if (!confirm("Delete this risk?")) return;
      await apiFetch(`/api/risks/${r.id}`, { method: "DELETE" });
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

  if (!project || !program) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const utilizationRate = Math.round((project.spent / project.budget) * 100);

  function riskTone(level: RiskItem["level"]) {
    if (level === "high" || level === "critical") {
      return { border: "border-rose-200 bg-rose-50", chip: "bg-rose-100 text-rose-700" };
    }
    if (level === "medium") {
      return { border: "border-amber-200 bg-amber-50", chip: "bg-amber-100 text-amber-700" };
    }
    return { border: "border-gray-200 bg-gray-50", chip: "bg-slate-100 text-slate-700" };
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[var(--navy)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {project.code} · {program.name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl text-[var(--navy)]">
              {project.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" /> {project.manager}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {project.location}, {project.region}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {project.duration.start} – {project.duration.end}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setProjectEditOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--navy)] hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" /> Edit project
            </button>
            <span
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                project.status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : project.status === "delayed"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {project.status}
            </span>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
              <FileText className="h-5 w-5" /> General Info
            </h3>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Donor</dt>
                <dd className="font-medium">{project.donor}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Manager</dt>
                <dd className="font-medium">{project.manager}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium">
                  {project.location}, {project.region}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Coordinates</dt>
                <dd className="font-medium">
                  {project.lat != null && project.lng != null
                    ? `${project.lat}, ${project.lng}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Beneficiaries</dt>
                <dd className="font-medium">{project.beneficiaries.toLocaleString("en-US")}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
              <DollarSign className="h-5 w-5" /> Financials
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Budget vs Spent</span>
                  <span className="font-medium">{utilizationRate}% utilized</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(project.spent, true)} spent</span>
                  <span>{formatCurrency(project.budget, true)} total</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="font-semibold">{formatCurrency(project.budget, true)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Spent</p>
                  <p className="font-semibold">{formatCurrency(project.spent, true)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
              <Target className="h-5 w-5" /> Implementation Status
            </h3>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Overall Progress</span>
                <span className="font-display text-2xl font-semibold">{project.progress}%</span>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
                <Target className="h-5 w-5" /> M&E Indicators
              </h3>
              <button
                type="button"
                onClick={openAddIndicator}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] px-2 py-1 text-sm font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)]/10"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {projectIndicators.length > 0 ? (
              <div className="mt-4 space-y-3">
                {projectIndicators.map((ind) => (
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
                          {ind.actual} / {ind.target} {ind.unit}
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
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No indicators defined yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Budget Lines</h3>
              <button
                type="button"
                onClick={() => setBudgetModal("new")}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] px-2 py-1 text-sm font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)]/10"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {projectBudgetLines.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="pb-2 text-left text-gray-600">Category</th>
                      <th className="pb-2 text-right text-gray-600">Budgeted</th>
                      <th className="pb-2 text-right text-gray-600">Spent</th>
                      <th className="w-24 pb-2 text-right text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectBudgetLines.map((bl) => (
                      <tr key={bl.id} className="border-b border-[var(--border)]/50">
                        <td className="py-2">{bl.category}</td>
                        <td className="py-2 text-right">{formatCurrency(bl.budgeted, true)}</td>
                        <td className="py-2 text-right">{formatCurrency(bl.spent, true)}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setBudgetModal(bl)}
                            className="mr-1 rounded p-1 text-gray-600 hover:bg-gray-100"
                            aria-label="Edit budget line"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(bl)}
                            className="rounded p-1 text-gray-600 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete budget line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No budget lines defined.</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
                <AlertTriangle className="h-5 w-5" /> Risk Register
              </h3>
              <button
                type="button"
                onClick={() => setRiskModal("new")}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] px-2 py-1 text-sm font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)]/10"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {projectRisks.length > 0 ? (
              <div className="mt-4 space-y-3">
                {projectRisks.map((risk) => {
                  const tone = riskTone(risk.level);
                  return (
                    <div
                      key={risk.id}
                      className={`rounded-lg border p-3 ${tone.border}`}
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium">{risk.description}</p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => setRiskModal(risk)}
                            className="rounded p-1 text-gray-600 hover:bg-white/80"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRisk(risk)}
                            className="rounded p-1 text-gray-600 hover:bg-white/80 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone.chip}`}>
                          {risk.level}
                        </span>
                        <span className="text-xs text-gray-500">{risk.status}</span>
                      </div>
                      {risk.mitigation && (
                        <p className="mt-2 text-xs text-gray-600">Mitigation: {risk.mitigation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No risks registered.</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Documents</h3>
          {project.documentNotes?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{project.documentNotes}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No document references yet. Add notes or links via &quot;Edit project&quot;.
            </p>
          )}
        </div>
      </div>

      {indicatorOpen && (
        <Modal
          title={indicatorEditing ? "Edit indicator" : "Add indicator"}
          onClose={() => {
            setIndicatorOpen(false);
            setIndicatorEditing(null);
          }}
        >
          <IndicatorForm
            key={indicatorEditing?.id ?? "new-indicator"}
            indicator={indicatorEditing}
            projectIds={[{ id: project.id, title: project.title }]}
            programIds={programIdsOpts}
            defaultProjectId={project.id}
            defaultScope="project"
            onSave={handleSaveIndicator}
            onCancel={() => {
              setIndicatorOpen(false);
              setIndicatorEditing(null);
            }}
          />
        </Modal>
      )}

      {projectEditOpen && (
        <Modal title="Edit project" onClose={() => setProjectEditOpen(false)}>
          <ProjectForm
            project={project}
            programIds={programIdsOpts}
            onSave={handleSaveProject}
            onCancel={() => setProjectEditOpen(false)}
          />
        </Modal>
      )}

      {budgetModal !== null && (
        <Modal
          title={budgetModal === "new" ? "Add budget line" : "Edit budget line"}
          onClose={() => setBudgetModal(null)}
        >
          <BudgetLineForm
            budgetLine={budgetModal === "new" ? null : budgetModal}
            projectId={project.id}
            onSave={handleSaveBudget}
            onCancel={() => setBudgetModal(null)}
          />
        </Modal>
      )}

      {riskModal !== null && (
        <Modal
          title={riskModal === "new" ? "Add risk" : "Edit risk"}
          onClose={() => setRiskModal(null)}
        >
          <RiskForm
            risk={riskModal === "new" ? null : riskModal}
            projectId={project.id}
            onSave={handleSaveRisk}
            onCancel={() => setRiskModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
