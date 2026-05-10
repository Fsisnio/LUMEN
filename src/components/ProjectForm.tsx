"use client";

import { useState, useEffect } from "react";
import type { Project, RiskLevel } from "@/lib/types";
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

const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Tambacounda", "Ziguinchor", "Kolda", "Fatick", "Kaolack", "Louga", "Matam", "Diourbel", "Kédougou", "Sédhiou"];

const STATUSES = ["active", "completed", "delayed", "planning"] as const;
const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

interface ProjectFormProps {
  project?: Project | null;
  programIds: { id: string; name: string }[];
  onSave: (data: Partial<Project>) => Promise<void>;
  onCancel: () => void;
}

export function ProjectForm({ project, programIds, onSave, onCancel }: ProjectFormProps) {
  const [form, setForm] = useState({
    code: "",
    title: "",
    programId: "",
    donor: "",
    budget: 0,
    spent: 0,
    startDate: "",
    endDate: "",
    location: "",
    region: "",
    manager: "",
    progress: 0,
    beneficiaries: 0,
    status: "active" as Project["status"],
    riskLevel: "low" as RiskLevel,
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    documentNotes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        code: project.code,
        title: project.title,
        programId: project.programId,
        donor: project.donor,
        budget: project.budget,
        spent: project.spent,
        startDate: project.duration.start,
        endDate: project.duration.end,
        location: project.location,
        region: project.region,
        manager: project.manager,
        progress: project.progress,
        beneficiaries: project.beneficiaries,
        status: project.status,
        riskLevel: project.riskLevel,
        lat: project.lat,
        lng: project.lng,
        documentNotes: project.documentNotes ?? "",
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        code: form.code,
        title: form.title,
        programId: form.programId,
        donor: form.donor,
        budget: Number(form.budget),
        spent: Number(form.spent),
        duration: { start: form.startDate, end: form.endDate },
        location: form.location,
        region: form.region,
        manager: form.manager,
        progress: Number(form.progress),
        beneficiaries: Number(form.beneficiaries),
        status: form.status,
        riskLevel: form.riskLevel,
        lat: form.lat !== undefined && !Number.isNaN(Number(form.lat)) ? Number(form.lat) : undefined,
        lng: form.lng !== undefined && !Number.isNaN(Number(form.lng)) ? Number(form.lng) : undefined,
        documentNotes: form.documentNotes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="FS-2024-003"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Program</label>
          <select
            value={form.programId}
            onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required
          >
            <option value="">Select program</option>
            {programIds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Donor</label>
          <input
            type="text"
            value={form.donor}
            onChange={(e) => setForm((f) => ({ ...f, donor: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Budget (USD)</label>
          <input
            type="number"
            value={form.budget || ""}
            onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Spent (USD)</label>
          <input
            type="number"
            value={form.spent || ""}
            onChange={(e) => setForm((f) => ({ ...f, spent: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="month"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="month"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Region</label>
          <select
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="">Select region</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Manager</label>
          <input
            type="text"
            value={form.manager}
            onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Beneficiaries</label>
          <input
            type="number"
            value={form.beneficiaries || ""}
            onChange={(e) => setForm((f) => ({ ...f, beneficiaries: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Progress (%)</label>
          <input
            type="number"
            value={form.progress || ""}
            onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Project["status"] }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
          <input
            type="number"
            step="any"
            value={form.lat ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lat: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="e.g. 14.7167"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
          <input
            type="number"
            step="any"
            value={form.lng ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lng: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="e.g. -17.4677"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Documents & references
        </label>
        <textarea
          value={form.documentNotes}
          onChange={(e) => setForm((f) => ({ ...f, documentNotes: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          rows={3}
          placeholder="Proposal, contract, or report links and notes"
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
          {saving ? "Saving…" : project ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
