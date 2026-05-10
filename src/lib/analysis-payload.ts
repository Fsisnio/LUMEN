import type { DataStore } from "@/lib/data-store";

/**
 * Compact snapshot for AI analysis (limits token use while keeping signal).
 * Accepts the public-facing slice of the data store (no users/sessions).
 */
export type AnalysisStore = Omit<DataStore, "users" | "sessions">;

export function buildAnalysisSnapshot(store: AnalysisStore, tenantId?: string | null) {
  const programById = Object.fromEntries(store.programs.map((p) => [p.id, p.name]));
  const tenantOrg = tenantId ? store.organizations.find((o) => o.id === tenantId) : undefined;

  const projects = store.projects.map((p) => ({
    code: p.code,
    title: p.title,
    program: programById[p.programId] ?? p.programId,
    donor: p.donor,
    budgetUsd: p.budget,
    spentUsd: p.spent,
    utilizationPct: p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0,
    region: p.region,
    location: p.location,
    status: p.status,
    riskLevel: p.riskLevel,
    progressPct: p.progress,
    beneficiaries: p.beneficiaries,
    duration: p.duration,
    manager: p.manager,
  }));

  const programs = store.programs.map((p) => ({
    name: p.name,
    totalBudgetUsd: p.totalBudget,
    spentBudgetUsd: p.spentBudget,
    activeProjectsCount: p.activeProjects,
    riskLevel: p.riskLevel,
    derivedProjectCount: store.projects.filter((pr) => pr.programId === p.id).length,
  }));

  const indicators = store.indicators.map((i) => ({
    name: i.name,
    unit: i.unit,
    target: i.target,
    actual: i.actual,
    pct: i.target > 0 ? Math.round((i.actual / i.target) * 100) : 0,
    scope: i.projectId
      ? `project:${i.projectId}`
      : i.programId
        ? `program:${i.programId}`
        : "unknown",
  }));

  const risks = store.risks.map((r) => ({
    projectId: r.projectId,
    level: r.level,
    status: r.status,
    description: r.description,
    mitigation: r.mitigation,
  }));

  const orgs = store.organizations.map((o) => ({
    name: o.name,
    type: o.type,
    country: o.country,
    region: o.region,
  }));

  const aggregates = {
    projectCount: store.projects.length,
    programCount: store.programs.length,
    totalBudgetUsdPrograms: store.programs.reduce((s, p) => s + p.totalBudget, 0),
    totalSpentUsdPrograms: store.programs.reduce((s, p) => s + p.spentBudget, 0),
    totalBeneficiaries: store.projects.reduce((s, p) => s + p.beneficiaries, 0),
    highRiskProjects: store.projects.filter(
      (p) => p.riskLevel === "high" || p.riskLevel === "critical"
    ).length,
    openRisks: store.risks.filter((r) => r.status === "open").length,
  };

  return {
    meta: {
      platform: "CARIPRIP / Lumen",
      context: "Faith-based humanitarian programming",
      currencyNote: "Monetary fields in snapshot are stored in USD in the database.",
      tenant: tenantOrg
        ? {
            id: tenantOrg.id,
            name: tenantOrg.name,
            country: tenantOrg.country,
            type: tenantOrg.type,
          }
        : null,
      scopeNote: tenantOrg
        ? `All figures below are scoped to ${tenantOrg.name} (${tenantOrg.country}).`
        : "Cross-tenant view: data spans every organization registered on the platform.",
    },
    aggregates,
    organizations: orgs,
    programs,
    projects,
    indicators,
    risks,
  };
}
