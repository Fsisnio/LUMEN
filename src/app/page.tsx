"use client";

import { KPICard } from "@/components/KPICard";
import {
  FolderKanban,
  DollarSign,
  MapPin,
  Users,
  AlertTriangle,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";

const PROGRAM_COLORS = [
  "#c9a227",
  "#2d3548",
  "#5c6b7a",
  "#8b9a6b",
  "#a67c52",
  "#6b8e9a",
  "#9a7b5c",
];

export default function DashboardPage() {
  return (
    <TenantGate>
      <DashboardPageInner />
    </TenantGate>
  );
}

function DashboardPageInner() {
  const { data, loading, error } = useData();
  const { formatCurrency, t } = useLocale();
  const { tenant } = useTenant();
  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];
  const indicators = data?.indicators ?? [];

  const totalProjects = projects.filter((p) => p.status === "active").length;
  const totalBudget = programs.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = programs.reduce((s, p) => s + p.spentBudget, 0);
  const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const totalBeneficiaries = projects.reduce((s, p) => s + p.beneficiaries, 0);
  const projectsEndingSoon = projects.filter((p) => {
    const end = new Date(p.duration.end);
    const now = new Date();
    const monthsLeft = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return monthsLeft <= 3 && monthsLeft > 0 && p.status === "active";
  }).length;
  const highRiskProjects = projects.filter((p) => p.riskLevel === "high" || p.riskLevel === "critical").length;

  const pieData = programs.map((p, i) => ({
    name: p.name,
    value: p.activeProjects,
    color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
  }));

  const barData = programs.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 10) + "…" : p.name,
    budget: p.totalBudget / 1000,
    spent: p.spentBudget / 1000,
  }));

  const regionData = projects.reduce((acc, p) => {
    acc[p.region] = (acc[p.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const regionChartData = Object.entries(regionData).map(([name, value]) => ({ name, value }));

  const programIndicators = indicators.filter((i) => i.programId);

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
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-gray-600">
          {t("dashboard.subtitle")}
        </p>
        {tenant && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
            {tenant.name} · {tenant.country}
          </p>
        )}
      </header>

      <div className="p-8">
        {/* KPI Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard
            title={t("dashboard.activeProjects")}
            value={totalProjects}
            icon={FolderKanban}
            subtitle={t("dashboard.acrossAllPrograms")}
          />
          <KPICard
            title={t("dashboard.totalBudget")}
            value={formatCurrency(totalBudget, true)}
            icon={DollarSign}
            subtitle={t("dashboard.committed")}
          />
          <KPICard
            title={t("dashboard.fundUtilization")}
            value={`${utilizationRate}%`}
            icon={TrendingUp}
            trend={utilizationRate >= 70 ? "up" : utilizationRate < 50 ? "down" : "neutral"}
            trendValue={utilizationRate >= 70 ? t("dashboard.onTrack") : utilizationRate < 50 ? t("dashboard.belowTarget") : t("dashboard.moderate")}
          />
          <KPICard
            title={t("dashboard.beneficiaries")}
            value={totalBeneficiaries.toLocaleString("en-US")}
            icon={Users}
            subtitle={t("dashboard.reached")}
          />
          <KPICard
            title={t("dashboard.projectsEndingSoon")}
            value={projectsEndingSoon}
            icon={AlertTriangle}
            subtitle={t("dashboard.within3Months")}
          />
          <KPICard
            title={t("dashboard.highRisk")}
            value={highRiskProjects}
            icon={AlertTriangle}
            trend={highRiskProjects > 0 ? "down" : "neutral"}
            trendValue={highRiskProjects > 0 ? t("dashboard.requiresAttention") : t("dashboard.allClear")}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              {t("dashboard.projectsByProgram")}
            </h3>
            <div className="mt-4 h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value != null ? `${value} projects` : "", "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              {t("dashboard.budgetByProgram")}
            </h3>
            <div className="mt-4 h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value != null ? formatCurrency((value as number) * 1000, true) : "", ""]} />
                  <Legend />
                  <Bar dataKey="budget" fill="#2d3548" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" fill="#c9a227" name="Spent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Key Indicators (Program-level) */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
            <Target className="h-5 w-5" /> {t("dashboard.keyIndicators")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{t("dashboard.aggregated")}</p>
          {programIndicators.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {programIndicators.slice(0, 8).map((ind) => (
                <div key={ind.id} className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-sm font-medium text-gray-700">{ind.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-xl font-semibold text-[var(--navy)]">
                      {ind.actual.toLocaleString("en-US")}
                    </span>
                    <span className="text-sm text-gray-500">/ {ind.target.toLocaleString("en-US")} {ind.unit}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{ width: `${Math.min((ind.actual / ind.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No program-level indicators defined.</p>
          )}
        </div>

        {/* Geographic & Programs Table */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              {t("dashboard.projectsByRegion")}
            </h3>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChartData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#c9a227" name="Projects" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              {t("dashboard.programSummary")}
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-2 text-left font-medium text-gray-600">Program</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Projects</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Budget</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Spent</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)]/50 last:border-0">
                      <td className="py-2.5 font-medium">{p.name}</td>
                      <td className="py-2.5 text-right">{p.activeProjects}</td>
                      <td className="py-2.5 text-right">{formatCurrency(p.totalBudget, true)}</td>
                      <td className="py-2.5 text-right">{formatCurrency(p.spentBudget, true)}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            p.riskLevel === "high"
                              ? "bg-rose-100 text-rose-700"
                              : p.riskLevel === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {p.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
