"use client";

import { useState, useEffect } from "react";
import type { Indicator } from "@/lib/types";

interface IndicatorFormProps {
  indicator?: Indicator | null;
  projectIds?: { id: string; title: string }[];
  programIds?: { id: string; name: string }[];
  defaultProjectId?: string;
  defaultProgramId?: string;
  defaultScope?: "project" | "program";
  onSave: (data: Partial<Indicator>) => Promise<void>;
  onCancel: () => void;
}

export function IndicatorForm({
  indicator,
  projectIds = [],
  programIds = [],
  defaultProjectId,
  defaultProgramId = "",
  defaultScope = "project",
  onSave,
  onCancel,
}: IndicatorFormProps) {
  const [form, setForm] = useState({
    scope: defaultScope as "project" | "program",
    projectId: defaultProjectId ?? "",
    programId: defaultProgramId,
    name: "",
    target: 0,
    actual: 0,
    unit: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (indicator) {
      setForm({
        scope: indicator.projectId ? "project" : "program",
        projectId: indicator.projectId ?? "",
        programId: indicator.programId ?? "",
        name: indicator.name,
        target: indicator.target,
        actual: indicator.actual,
        unit: indicator.unit,
      });
    }
  }, [indicator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Indicator> = {
        name: form.name,
        target: Number(form.target),
        actual: Number(form.actual),
        unit: form.unit,
      };
      type ExtraKeys = Partial<Record<keyof Indicator, string | null | undefined>>;
      const extra = {} as ExtraKeys;
      if (form.scope === "project" && form.projectId) {
        extra.projectId = form.projectId;
        extra.programId = indicator ? null : undefined;
      } else if (form.scope === "program" && form.programId) {
        extra.programId = form.programId;
        extra.projectId = indicator ? null : undefined;
      }
      await onSave({ ...payload, ...extra } as Partial<Indicator>);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Scope</label>
        <select
          value={form.scope}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              scope: e.target.value as "project" | "program",
              projectId: "",
              programId: "",
            }))
          }
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          <option value="project">Project</option>
          <option value="program">Program</option>
        </select>
      </div>

      {form.scope === "project" && projectIds.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required={form.scope === "project"}
          >
            <option value="">Select project</option>
            {projectIds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {form.scope === "program" && programIds.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Program</label>
          <select
            value={form.programId}
            onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required={form.scope === "program"}
          >
            <option value="">Select program</option>
            {programIds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Indicator Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="e.g. Households with grain storage"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Target</label>
          <input
            type="number"
            value={form.target || ""}
            onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Actual</label>
          <input
            type="number"
            value={form.actual || ""}
            onChange={(e) => setForm((f) => ({ ...f, actual: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
        <input
          type="text"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="e.g. households, people, children"
          required
        />
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
          {saving ? "Saving…" : indicator ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
