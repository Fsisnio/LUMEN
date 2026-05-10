"use client";

import { useState, useEffect } from "react";
import type { BudgetLine } from "@/lib/types";

interface BudgetLineFormProps {
  budgetLine?: BudgetLine | null;
  projectId: string;
  onSave: (data: Partial<BudgetLine>) => Promise<void>;
  onCancel: () => void;
}

export function BudgetLineForm({ budgetLine, projectId, onSave, onCancel }: BudgetLineFormProps) {
  const [form, setForm] = useState({
    category: "",
    budgeted: 0,
    spent: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budgetLine) {
      setForm({
        category: budgetLine.category,
        budgeted: budgetLine.budgeted,
        spent: budgetLine.spent,
      });
    }
  }, [budgetLine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        category: form.category,
        budgeted: Number(form.budgeted),
        spent: Number(form.spent),
      };
      if (budgetLine) {
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
        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <input
          type="text"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="e.g. Personnel, Equipment"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Budgeted (USD)</label>
          <input
            type="number"
            value={form.budgeted || ""}
            onChange={(e) => setForm((f) => ({ ...f, budgeted: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            min={0}
            required
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
          {saving ? "Saving…" : budgetLine ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
