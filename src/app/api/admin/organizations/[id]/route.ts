import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import {
  getBudgetLines,
  getIndicators,
  getOrganization,
  getPrograms,
  getProjects,
  getRisks,
  listUsersByOrganization,
} from "@/lib/data-store";
import { SUPERADMIN_ORG_ID } from "@/lib/superadmin-bootstrap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || id === SUPERADMIN_ORG_ID) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const org = await getOrganization(id, { skipComplimentaryMerge: true });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const [programs, projects, indicators, budgetLines, risks, members] = await Promise.all([
    getPrograms(id),
    getProjects(id),
    getIndicators({ tenantId: id }),
    getBudgetLines({ tenantId: id }),
    getRisks({ tenantId: id }),
    listUsersByOrganization(id),
  ]);

  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent ?? 0), 0);
  const totalBeneficiaries = projects.reduce((s, p) => s + (p.beneficiaries ?? 0), 0);
  const utilizationPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const byStatus = projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    { active: 0, completed: 0, delayed: 0, planning: 0 } as Record<string, number>
  );

  const byRisk = projects.reduce(
    (acc, p) => {
      acc[p.riskLevel] = (acc[p.riskLevel] ?? 0) + 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 } as Record<string, number>
  );

  const indicatorAttainment = (() => {
    let target = 0;
    let actual = 0;
    for (const i of indicators) {
      target += i.target ?? 0;
      actual += i.actual ?? 0;
    }
    return { target, actual, pct: target > 0 ? Math.round((actual / target) * 100) : 0 };
  })();

  return NextResponse.json({
    organization: org,
    metrics: {
      totalBudget,
      totalSpent,
      utilizationPct,
      totalBeneficiaries,
      byStatus,
      byRisk,
      indicatorAttainment,
    },
    programs,
    projects,
    indicators,
    budgetLines,
    risks,
    members: members.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      isSuperadmin: u.isSuperadmin === true,
    })),
  });
}
