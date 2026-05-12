"use client";

import Link from "next/link";
import { Search, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import { ProjectForm } from "@/components/ProjectForm";
import { Modal } from "@/components/Modal";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  return (
    <TenantGate>
      <ProjectsPageInner />
    </TenantGate>
  );
}

function ProjectsPageInner() {
  const { data, loading, error, refetch } = useData();
  const { formatCurrency, t } = useLocale();
  const { apiFetch } = useTenant();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalProject, setModalProject] = useState<Project | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];
  const indicators = data?.indicators ?? [];

  const programIds = programs.map((p) => ({ id: p.id, name: p.name }));

  const filtered = projects.filter((p) => {
    const program = programs.find((pr) => pr.id === p.programId);
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.donor.toLowerCase().includes(search.toLowerCase());
    const matchesProgram = programFilter === "all" || p.programId === programFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesProgram && matchesStatus;
  });

  const handleSaveProject = useCallback(
    async (formData: Partial<Project>) => {
      if (modalProject === "new") {
        await apiFetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else if (modalProject && "id" in modalProject) {
        await apiFetch(`/api/projects/${modalProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      await refetch();
      setModalProject(null);
    },
    [modalProject, refetch, apiFetch]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this project? This will also remove its indicators and risks.")) return;
      setDeleting(id);
      try {
        await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
        await refetch();
        setModalProject(null);
      } finally {
        setDeleting(null);
      }
    },
    [refetch, apiFetch]
  );

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
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--navy)] sm:text-3xl">{t("projects.title")}</h1>
            <p className="mt-1 text-gray-600">{t("projects.subtitle")}</p>
          </div>
          <button
            onClick={() => setModalProject("new")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-dark)] sm:mt-2"
          >
            <Plus className="h-4 w-4" /> {t("projects.addProject")}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, code, or donor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] py-2 pl-10 pr-4 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="all">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="planning">Planning</option>
          </select>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Program</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Donor</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Budget</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Progress</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">Indicators</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const program = programs.find((p) => p.id === project.programId);
                  return (
                    <tr
                      key={project.id}
                      className="border-b border-[var(--border)]/50 transition-colors hover:bg-gray-50 last:border-0"
                    >
                      <td className="px-6 py-3 font-mono text-sm">{project.code}</td>
                      <td className="px-6 py-3 font-medium">{project.title}</td>
                      <td className="px-6 py-3 text-gray-600">{program?.name}</td>
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
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            project.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : project.status === "delayed"
                              ? "bg-rose-100 text-rose-700"
                              : project.status === "completed"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalProject(project)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[var(--navy)]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            disabled={deleting === project.id}
                            className="rounded p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-dark)] hover:underline"
                          >
                            View <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500">{t("projects.noMatch")}</div>
          )}
        </div>
      </div>

      {modalProject && (
        <Modal
          title={modalProject === "new" ? t("projects.addProject") : t("projects.editProject")}
          onClose={() => setModalProject(null)}
        >
          <ProjectForm
            project={modalProject === "new" ? null : modalProject}
            programIds={programIds}
            onSave={handleSaveProject}
            onCancel={() => setModalProject(null)}
          />
        </Modal>
      )}
    </div>
  );
}
