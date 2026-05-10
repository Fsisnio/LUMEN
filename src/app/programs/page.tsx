"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { ChevronRight, FolderKanban, Plus, Pencil } from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import { ProgramForm } from "@/components/ProgramForm";
import { Modal } from "@/components/Modal";
import type { Program } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PROGRAM_COLORS = ["#c9a227", "#2d3548", "#5c6b7a", "#8b9a6b", "#a67c52", "#6b8e9a", "#9a7b5c"];

export default function ProgramsPage() {
  return (
    <TenantGate>
      <ProgramsPageInner />
    </TenantGate>
  );
}

function ProgramsPageInner() {
  const { data, loading, error, refetch } = useData();
  const { formatCurrency, t } = useLocale();
  const { tenant, apiFetch } = useTenant();
  const [modalProgram, setModalProgram] = useState<Program | null | "new">(null);

  const programs = data?.programs ?? [];
  const projects = data?.projects ?? [];

  const handleSaveProgram = useCallback(
    async (formData: Partial<Program>) => {
      if (modalProgram === "new") {
        await apiFetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else if (modalProgram && "id" in modalProgram) {
        await apiFetch(`/api/programs/${modalProgram.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      await refetch();
      setModalProgram(null);
    },
    [modalProgram, refetch, apiFetch]
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">{t("programs.title")}</h1>
            <p className="mt-1 text-gray-600">
              {t("programs.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setModalProgram("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-dark)]"
          >
            <Plus className="h-4 w-4" /> {t("programs.addProgram")}
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Budget by Program
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={programs.map((p) => ({
                    name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
                    budget: p.totalBudget / 1000,
                    spent: p.spentBudget / 1000,
                    utilization: p.totalBudget > 0 ? Math.round((p.spentBudget / p.totalBudget) * 100) : 0,
                  }))}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <XAxis type="number" tickFormatter={(v) => formatCurrency((v as number) * 1000, true)} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v != null ? formatCurrency((v as number) * 1000, true) : "", ""]} />
                  <Legend />
                  <Bar dataKey="budget" fill="#2d3548" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" fill="#c9a227" name="Spent" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Projects per Program
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programs.map((p, i) => ({
                      name: p.name,
                      value: p.activeProjects,
                      color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {programs.map((_, i) => (
                      <Cell key={i} fill={PROGRAM_COLORS[i % PROGRAM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-display text-lg font-semibold text-[var(--navy)]">
            {t("programs.programDashboards")}
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {programs.map((program) => {
              const programProjects = projects.filter((p) => p.programId === program.id);
              const burnRate =
                programProjects.length > 0 && programProjects.some((p) => p.budget > 0)
                  ? programProjects.reduce((s, p) => s + (p.budget > 0 ? (p.spent / p.budget) * 100 : 0), 0) /
                    programProjects.length
                  : 0;
              return (
                <div
                  key={program.id}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
                >
                  <Link href={`/programs/${program.id}`} className="flex flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/15">
                      <FolderKanban className="h-6 w-6 text-[var(--accent-dark)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{program.name}</p>
                      <p className="text-sm text-gray-500">
                        {program.activeProjects} projects · {formatCurrency(program.totalBudget, true)} budget ·{" "}
                        {Math.round(burnRate)}% burn rate
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-medium ${
                          program.riskLevel === "high"
                            ? "bg-rose-100 text-rose-700"
                            : program.riskLevel === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {program.riskLevel} risk
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); setModalProgram(program); }}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[var(--navy)]"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalProgram && (
        <Modal
          title={modalProgram === "new" ? t("programs.addProgram") : t("programs.editProgram")}
          onClose={() => setModalProgram(null)}
        >
          <ProgramForm
            program={modalProgram === "new" ? null : modalProgram}
            tenantLabel={tenant ? `${tenant.name} — ${tenant.country}` : undefined}
            onSave={handleSaveProgram}
            onCancel={() => setModalProgram(null)}
          />
        </Modal>
      )}
    </div>
  );
}
