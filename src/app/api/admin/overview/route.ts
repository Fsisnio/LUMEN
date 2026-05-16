import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import {
  getFullStore,
  getOrganizations,
  listAllUsers,
} from "@/lib/data-store";
import { SUPERADMIN_ORG_ID } from "@/lib/superadmin-bootstrap";
import type { Indicator, Organization, Project } from "@/lib/types";

const TIER_USD: Record<string, number> = {
  day_pass: 3,
  week_pass: 5,
  month_pass: 15,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function effectiveTier(o: Organization, now: number): string {
  if (!o.subscription) return "free";
  return Date.parse(o.subscription.paidUntil) > now ? o.subscription.tier : "free";
}

function topN<T>(rows: T[], score: (r: T) => number, n: number): T[] {
  return [...rows].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const [orgsRaw, usersRaw, store] = await Promise.all([
    getOrganizations(),
    listAllUsers(),
    getFullStore(),
  ]);

  const orgs = orgsRaw.filter((o) => o.id !== SUPERADMIN_ORG_ID);
  const users = usersRaw.filter((u) => u.organizationId !== SUPERADMIN_ORG_ID);
  const orgIds = new Set(orgs.map((o) => o.id));

  const programs = store.programs.filter((p) => orgIds.has(p.organizationId));
  const projects = store.projects.filter((p) => orgIds.has(p.organizationId));
  const indicators = store.indicators.filter((i) => orgIds.has(i.organizationId));
  const risks = store.risks.filter((r) => orgIds.has(r.organizationId));

  const now = Date.now();
  const activeSubs = orgs.filter(
    (o) => o.subscription && Date.parse(o.subscription.paidUntil) > now
  );

  const byTier: Record<string, number> = { free: 0, day_pass: 0, week_pass: 0, month_pass: 0 };
  for (const o of orgs) byTier[effectiveTier(o, now)] = (byTier[effectiveTier(o, now)] ?? 0) + 1;

  const estimatedMrrUsd = activeSubs.reduce((sum, o) => {
    const tier = o.subscription?.tier ?? "free";
    return sum + (TIER_USD[tier] ?? 0);
  }, 0);

  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent ?? 0), 0);
  const utilizationPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const totalBeneficiaries = projects.reduce((s, p) => s + (p.beneficiaries ?? 0), 0);

  const byStatus: Record<Project["status"], number> = {
    active: 0,
    completed: 0,
    delayed: 0,
    planning: 0,
  };
  for (const p of projects) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

  const byRisk: Record<"low" | "medium" | "high" | "critical", number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const p of projects) byRisk[p.riskLevel] = (byRisk[p.riskLevel] ?? 0) + 1;

  const risksOpen = risks.filter((r) => r.status === "open").length;
  const risksHighCrit = risks.filter((r) => r.level === "high" || r.level === "critical").length;

  const byCountryMap = new Map<string, { country: string; orgs: number; projects: number; users: number; budget: number }>();
  for (const o of orgs) {
    const c = o.country || "—";
    const row = byCountryMap.get(c) ?? { country: c, orgs: 0, projects: 0, users: 0, budget: 0 };
    row.orgs += 1;
    byCountryMap.set(c, row);
  }
  for (const u of users) {
    const o = orgs.find((x) => x.id === u.organizationId);
    if (!o) continue;
    const row = byCountryMap.get(o.country || "—");
    if (row) row.users += 1;
  }
  for (const p of projects) {
    const o = orgs.find((x) => x.id === p.organizationId);
    if (!o) continue;
    const row = byCountryMap.get(o.country || "—");
    if (row) {
      row.projects += 1;
      row.budget += p.budget ?? 0;
    }
  }
  const byCountry = topN(Array.from(byCountryMap.values()), (r) => r.budget || r.projects, 12);

  const byThemeMap = new Map<string, { theme: string; count: number; budget: number; spent: number; projects: number }>();
  for (const p of programs) {
    const row = byThemeMap.get(p.name) ?? { theme: p.name, count: 0, budget: 0, spent: 0, projects: 0 };
    row.count += 1;
    row.budget += p.totalBudget ?? 0;
    row.spent += p.spentBudget ?? 0;
    byThemeMap.set(p.name, row);
  }
  for (const prj of projects) {
    const prog = programs.find((p) => p.id === prj.programId);
    if (!prog) continue;
    const row = byThemeMap.get(prog.name);
    if (row) row.projects += 1;
  }
  const programsByTheme = Array.from(byThemeMap.values()).sort((a, b) => b.budget - a.budget);

  const userCounts = new Map<string, number>();
  for (const u of users) userCounts.set(u.organizationId, (userCounts.get(u.organizationId) ?? 0) + 1);
  const projectCounts = new Map<string, number>();
  const projectBudget = new Map<string, number>();
  const projectSpent = new Map<string, number>();
  const orgBeneficiaries = new Map<string, number>();
  for (const p of projects) {
    projectCounts.set(p.organizationId, (projectCounts.get(p.organizationId) ?? 0) + 1);
    projectBudget.set(p.organizationId, (projectBudget.get(p.organizationId) ?? 0) + (p.budget ?? 0));
    projectSpent.set(p.organizationId, (projectSpent.get(p.organizationId) ?? 0) + (p.spent ?? 0));
    orgBeneficiaries.set(p.organizationId, (orgBeneficiaries.get(p.organizationId) ?? 0) + (p.beneficiaries ?? 0));
  }

  const orgsEnriched = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    country: o.country,
    users: userCounts.get(o.id) ?? 0,
    projects: projectCounts.get(o.id) ?? 0,
    budget: projectBudget.get(o.id) ?? 0,
    spent: projectSpent.get(o.id) ?? 0,
    beneficiaries: orgBeneficiaries.get(o.id) ?? 0,
    tier: effectiveTier(o, now),
  }));

  const topOrgsByBudget = topN(orgsEnriched, (r) => r.budget, 6);
  const topOrgsByBeneficiaries = topN(orgsEnriched, (r) => r.beneficiaries, 6);

  const SOON_MS = 14 * DAY_MS;
  const passesExpiringSoon = orgs
    .filter((o) => o.subscription)
    .map((o) => ({
      orgId: o.id,
      name: o.name,
      country: o.country,
      tier: o.subscription!.tier,
      paidUntil: o.subscription!.paidUntil,
      daysLeft: Math.round((Date.parse(o.subscription!.paidUntil) - now) / DAY_MS),
    }))
    .filter((x) => x.daysLeft >= 0 && x.daysLeft <= 14 && Date.parse(x.paidUntil) - now <= SOON_MS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  const indicatorAggregate = aggregateIndicators(indicators);

  const recentSignups = users
    .map((u) => {
      const org = orgs.find((o) => o.id === u.organizationId);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        organizationName: org?.name ?? "—",
        country: org?.country ?? "—",
        createdAt: u.createdAt,
        isSuperadmin: u.isSuperadmin === true,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 8);

  return NextResponse.json({
    counts: {
      organizations: orgs.length,
      users: users.length,
      programs: programs.length,
      projects: projects.length,
      indicators: indicators.length,
      risks: risks.length,
      activeSubscriptions: activeSubs.length,
    },
    financial: { totalBudget, totalSpent, utilizationPct, totalBeneficiaries },
    estimatedMrrUsd,
    byTier,
    byStatus,
    byRisk,
    risks: { open: risksOpen, highOrCritical: risksHighCrit },
    byCountry,
    programsByTheme,
    topOrgsByBudget,
    topOrgsByBeneficiaries,
    passesExpiringSoon,
    indicators: indicatorAggregate,
    recentSignups,
  });
}

function aggregateIndicators(rows: Indicator[]): {
  totalTarget: number;
  totalActual: number;
  attainmentPct: number;
  topUnits: { unit: string; actual: number; target: number }[];
} {
  let totalTarget = 0;
  let totalActual = 0;
  const byUnit = new Map<string, { actual: number; target: number }>();
  for (const i of rows) {
    totalTarget += i.target ?? 0;
    totalActual += i.actual ?? 0;
    const u = i.unit || "—";
    const row = byUnit.get(u) ?? { actual: 0, target: 0 };
    row.actual += i.actual ?? 0;
    row.target += i.target ?? 0;
    byUnit.set(u, row);
  }
  return {
    totalTarget,
    totalActual,
    attainmentPct: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0,
    topUnits: Array.from(byUnit.entries())
      .map(([unit, v]) => ({ unit, ...v }))
      .sort((a, b) => b.target - a.target)
      .slice(0, 4),
  };
}
