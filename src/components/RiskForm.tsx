"use client";

import { useState, useEffect } from "react";
import type { RiskItem, RiskLevel } from "@/lib/types";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
const STATUSES: RiskItem["status"][] = ["open", "mitigated", "closed"];

interface RiskFormProps {
  risk?: RiskItem | null;
  projectId: string;
  onSave: (data: Partial<RiskItem>) => Promise<void>;
  onCancel: () => void;
}

export function RiskForm({ risk, projectId, onSave, onCancel }: RiskFormProps) {
  const [form, setForm] = useState({
    description: "",
    level: "medium" as RiskLevel,
    mitigation: "",
    status: "open" as RiskItem["status"],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (risk) {
      setForm({
        description: risk.description,
        level: risk.level,
        mitigation: risk.mitigation ?? "",
        status: risk.status,
      });
    }
  }, [risk]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        description: form.description,
        level: form.level,
        status: form.status,
        mitigation: form.mitigation.trim() || undefined,
      };
      if (risk) {
        await onSave(base);
      } else {
        await onSave({ ...base, projectId });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          rows={3}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Level</label>
          <select
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as RiskLevel }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as RiskItem["status"] }))
            }
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
        <label className="mb-1 block text-sm font-medium text-gray-700">Mitigation</label>
        <textarea
          value={form.mitigation}
          onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          rows={2}
          placeholder="Optional"
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
          {saving ? "Saving…" : risk ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
