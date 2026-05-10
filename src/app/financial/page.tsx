"use client";

import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { TenantGate } from "@/components/TenantGate";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

export default function FinancialPage() {
  return (
    <TenantGate>
      <FinancialPageInner />
    </TenantGate>
  );
}

function FinancialPageInner() {
  const { data, loading, error } = useData();
  const { formatCurrency, t } = useLocale();
  const programs = data?.programs ?? [];
  const projects = data?.projects ?? [];

  const totalBudget = programs.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = programs.reduce((s, p) => s + p.spentBudget, 0);
  const utilizationRate = Math.round((totalSpent / totalBudget) * 100);

  const programFinancials = programs.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 10) + "…" : p.name,
    budget: p.totalBudget / 1000,
    spent: p.spentBudget / 1000,
    utilization: Math.round((p.spentBudget / p.totalBudget) * 100),
  }));

  // Simulate burn rate over time
  const burnRateData = [
    { month: "Jul", planned: 15, actual: 12 },
    { month: "Aug", planned: 25, actual: 22 },
    { month: "Sep", planned: 35, actual: 38 },
    { month: "Oct", planned: 45, actual: 42 },
    { month: "Nov", planned: 55, actual: 58 },
    { month: "Dec", planned: 65, actual: 65 },
  ];

  const slowSpenders = projects.filter((p) => {
    const rate = (p.spent / p.budget) * 100;
    const elapsed = 70; // assume 70% of time elapsed
    return rate < elapsed - 15 && p.status === "active";
  });
  const fastSpenders = projects.filter((p) => {
    const rate = (p.spent / p.budget) * 100;
    const elapsed = 70;
    return rate > elapsed + 15 && p.status === "active";
  });

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
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">
          {t("financial.title")}
        </h1>
        <p className="mt-1 text-gray-600">
          {t("financial.subtitle")}
        </p>
      </header>

      <div className="p-8">
        {/* KPI Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Committed</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {formatCurrency(totalBudget, true)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--accent)]/50" />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {formatCurrency(totalSpent, true)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--accent)]/50" />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fund Utilization</p>
                <p className="mt-1 font-display text-2xl font-semibold">{utilizationRate}%</p>
              </div>
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  utilizationRate >= 70 ? "bg-emerald-100" : utilizationRate < 50 ? "bg-rose-100" : "bg-amber-100"
                }`}
              >
                <span
                  className={`text-lg font-bold ${
                    utilizationRate >= 70 ? "text-emerald-600" : utilizationRate < 50 ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  {utilizationRate}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Spending Alerts</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {slowSpenders.length + fastSpenders.length}
                </p>
                <p className="text-xs text-gray-500">
                  {slowSpenders.length} slow · {fastSpenders.length} fast
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Budget vs Actual by Program
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programFinancials} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency((v as number) * 1000, true)} />
                  <Tooltip formatter={(v) => [v != null ? formatCurrency((v as number) * 1000, true) : "", ""]} />
                  <Legend />
                  <Bar dataKey="budget" fill="#2d3548" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" fill="#c9a227" name="Spent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Cumulative Burn Rate (Planned vs Actual)
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burnRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [v != null ? `${v}%` : "", ""]} />
                  <Legend />
                  <Line type="monotone" dataKey="planned" stroke="#2d3548" strokeWidth={2} name="Planned" />
                  <Line type="monotone" dataKey="actual" stroke="#c9a227" strokeWidth={2} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-800">
              <AlertTriangle className="h-5 w-5" /> Slow Spending Alert
            </h3>
            <p className="mt-2 text-sm text-amber-700">
              Projects spending significantly below expected rate. May indicate delays.
            </p>
            {slowSpenders.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {slowSpenders.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-sm text-amber-700">
                      {Math.round((p.spent / p.budget) * 100)}% spent
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-amber-600">No slow spenders at this time.</p>
            )}
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-rose-800">
              <AlertTriangle className="h-5 w-5" /> Fast Spending Alert
            </h3>
            <p className="mt-2 text-sm text-rose-700">
              Projects spending faster than planned. Risk of funding gap before project end.
            </p>
            {fastSpenders.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {fastSpenders.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-sm text-rose-700">
                      {Math.round((p.spent / p.budget) * 100)}% spent
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-rose-600">No fast spenders at this time.</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
            Donor Reporting Period Tracking
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Track reporting deadlines by donor. Integration with donor portals coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
