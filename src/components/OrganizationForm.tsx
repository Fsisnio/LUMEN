"use client";

import { useState, useEffect } from "react";
import type { Organization } from "@/lib/types";
import { COUNTRIES } from "@/lib/countries";

const TYPES: Organization["type"][] = [
  "National Office",
  "Diocesan Branch",
  "Regional Coordination",
];

interface OrganizationFormProps {
  organization?: Organization | null;
  onSave: (data: Partial<Organization>) => Promise<void>;
  onCancel: () => void;
}

export function OrganizationForm({ organization, onSave, onCancel }: OrganizationFormProps) {
  const [form, setForm] = useState({
    name: "",
    type: "National Office" as Organization["type"],
    country: "Senegal",
    region: "",
    diocese: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name,
        type: organization.type,
        country: organization.country ?? "Senegal",
        region: organization.region ?? "",
        diocese: organization.diocese ?? "",
      });
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        type: form.type,
        country: form.country,
        region: form.region.trim() || undefined,
        diocese: form.diocese.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Organization["type"] }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
          <select
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Region</label>
          <input
            type="text"
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Diocese</label>
          <input
            type="text"
            value={form.diocese}
            onChange={(e) => setForm((f) => ({ ...f, diocese: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="Optional"
          />
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
          {saving ? "Saving…" : organization ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
