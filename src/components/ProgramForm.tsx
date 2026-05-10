"use client";

import { useState, useEffect } from "react";
import type { Program, RiskLevel } from "@/lib/types";
import type { ProgramTheme } from "@/lib/types";

const PROGRAMS: ProgramTheme[] = [
  "Food Security",
  "Health & Nutrition",
  "Education",
  "Livelihoods",
  "Emergency Response",
  "Social Protection",
  "Climate Resilience",
];

const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

interface ProgramFormProps {
  program?: Program | null;
  /** Optional label of the current tenant — purely informational. */
  tenantLabel?: string;
  onSave: (data: Partial<Program>) => Promise<void>;
  onCancel: () => void;
}

export function ProgramForm({ program, tenantLabel, onSave, onCancel }: ProgramFormProps) {
  const [form, setForm] = useState({
    name: "" as ProgramTheme | "",
    description: "",
    totalBudget: 0,
    spentBudget: 0,
    activeProjects: 0,
    riskLevel: "low" as RiskLevel,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name,
        description: program.description ?? "",
        totalBudget: program.totalBudget,
        spentBudget: program.spentBudget,
        activeProjects: program.activeProjects,
        riskLevel: program.riskLevel,
      });
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      await onSave({
        name: form.name as ProgramTheme,
        description: form.description.trim() || undefined,
        totalBudget: Number(form.totalBudget),
        spentBudget: Number(form.spentBudget),
        activeProjects: Number(form.activeProjects),
        riskLevel: form.riskLevel,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Program Name</label>
        <select
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value as ProgramTheme }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          required
        >
          <option value="">Select program</option>
          {PROGRAMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {tenantLabel && (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Organization: <span className="font-medium text-[var(--navy)]">{tenantLabel}</span>
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          rows={3}
          placeholder="Program objectives and scope"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Total Budget (USD)</label>
          <input
            type="number"
            value={form.totalBudget || ""}
            onChange={(e) => setForm((f) => ({ ...f, totalBudget: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Spent Budget (USD)</label>
          <input
            type="number"
            value={form.spentBudget || ""}
            onChange={(e) => setForm((f) => ({ ...f, spentBudget: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Active Projects</label>
          <input
            type="number"
            value={form.activeProjects || ""}
            onChange={(e) => setForm((f) => ({ ...f, activeProjects: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Risk Level</label>
          <select
            value={form.riskLevel}
            onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value as RiskLevel }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-50"
        >
          {saving ? "Saving…" : program ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
