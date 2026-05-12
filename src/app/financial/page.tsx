"use client";

import type { Project } from "@/lib/types";
import type { LanguageCode } from "@/lib/locale";
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

const MS_DAY = 24 * 60 * 60 * 1000;

function safePct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function projectElapsedFracAt(project: Project, whenMs: number): number | null {
  const start = new Date(project.duration.start).getTime();
  const end = new Date(project.duration.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.min(1, Math.max(0, (whenMs - start) / (end - start)));
}

function portfolioPlannedConsumptionPct(projects: Project[], whenMs: number): number {
  const withBudget = projects.filter((p) => p.budget > 0);
  if (withBudget.length === 0) return 0;
  const totalB = withBudget.reduce((s, p) => s + p.budget, 0);
  if (totalB <= 0) return 0;
  let weighted = 0;
  for (const p of withBudget) {
    const frac = projectElapsedFracAt(p, whenMs);
    if (frac == null) continue;
    weighted += p.budget * frac;
  }
  return (weighted / totalB) * 100;
}

function buildBurnRateSeries(
  projects: Project[],
  totalBudget: number,
  totalSpent: number,
  language: LanguageCode
): { month: string; planned: number; actual: number }[] {
  const now = new Date();
  const nowMs = now.getTime();
  const formatter = new Intl.DateTimeFormat(language === "fr" ? "fr" : "en-US", { month: "short" });
  const spentPctToday = safePct(totalSpent, totalBudget);

  const activeProjects = projects.filter((p) => p.status !== "completed");
  const pool = activeProjects.length > 0 ? activeProjects : projects;

  const rows: { month: string; planned: number; actual: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const monthMid = new Date(now.getFullYear(), now.getMonth() - 5 + i, 15);
    const endOfMonth = new Date(monthMid.getFullYear(), monthMid.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    let planned: number;

    const budgetProjects = pool.filter((p) => p.budget > 0);
    if (budgetProjects.length > 0) {
      planned = portfolioPlannedConsumptionPct(pool, endOfMonth);
    } else if (pool.length > 0) {
      let sum = 0;
      let n = 0;
      for (const p of pool) {
        const f = projectElapsedFracAt(p, endOfMonth);
        if (f != null) {
          sum += f * 100;
          n++;
        }
      }
      planned = n > 0 ? sum / n : 0;
    } else {
      const rangeStart = nowMs - 180 * MS_DAY;
      const rangeEnd = Math.max(nowMs + MS_DAY, rangeStart + MS_DAY);
      const span = rangeEnd - rangeStart;
      planned =
        totalBudget <= 0 ? 0 : Math.min(100, Math.max(0, ((endOfMonth - rangeStart) / span) * 100));
    }

    let actual = 0;
    if (totalBudget > 0 && spentPctToday > 0) {
      if (endOfMonth <= nowMs) {
        const horizonStart =
          budgetProjects.length > 0
            ? Math.min(...budgetProjects.map((p) => new Date(p.duration.start).getTime()))
            : pool.length > 0
              ? Math.min(...pool.map((p) => new Date(p.duration.start).getTime()))
              : nowMs - 180 * MS_DAY;
        const denom = Math.max(nowMs - horizonStart, MS_DAY);
        actual = spentPctToday * Math.min(1, (endOfMonth - horizonStart) / denom);
      } else {
        actual = spentPctToday;
      }
    }

    rows.push({
      month: formatter.format(monthMid),
      planned: round1(planned),
      actual: round1(actual),
    });
  }

  return rows;
}

function projectTimeElapsedPct(project: Project): number | null {
  const frac = projectElapsedFracAt(project, Date.now());
  return frac == null ? null : frac * 100;
}

export default function FinancialPage() {
  return (
    <TenantGate>
      <FinancialPageInner />
    </TenantGate>
  );
}

function FinancialPageInner() {
  const { data, loading, error } = useData();
  const { formatCurrency, t, language } = useLocale();
  const programs = data?.programs ?? [];
  const projects = data?.projects ?? [];

  const totalBudget = programs.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = programs.reduce((s, p) => s + p.spentBudget, 0);
  const utilizationRate = safePct(totalSpent, totalBudget);

  const programFinancials = programs.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 10) + "…" : p.name,
    budget: p.totalBudget / 1000,
    spent: p.spentBudget / 1000,
    utilization: safePct(p.spentBudget, p.totalBudget),
  }));

  const burnRateData = buildBurnRateSeries(projects, totalBudget, totalSpent, language);

  const slowSpenders = projects.filter((p) => {
    if (p.status !== "active" || p.budget <= 0) return false;
    const elapsed = projectTimeElapsedPct(p);
    if (elapsed == null) return false;
    const rate = (p.spent / p.budget) * 100;
    return rate < elapsed - 15;
  });
  const fastSpenders = projects.filter((p) => {
    if (p.status !== "active" || p.budget <= 0) return false;
    const elapsed = projectTimeElapsedPct(p);
    if (elapsed == null) return false;
    const rate = (p.spent / p.budget) * 100;
    return rate > elapsed + 15;
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
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl text-[var(--navy)]">
          {t("financial.title")}
        </h1>
        <p className="mt-1 text-gray-600">
          {t("financial.subtitle")}
        </p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
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
                    <span className="text-sm text-amber-700">{safePct(p.spent, p.budget)}% spent</span>
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
                    <span className="text-sm text-rose-700">{safePct(p.spent, p.budget)}% spent</span>
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
