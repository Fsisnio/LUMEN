import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import {
  getFullStore,
  getOrganizations,
  listAllUsers,
} from "@/lib/data-store";
import { SUPERADMIN_ORG_ID } from "@/lib/superadmin-bootstrap";

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const [orgs, users, store] = await Promise.all([
    getOrganizations(),
    listAllUsers(),
    getFullStore(),
  ]);

  const userCounts = new Map<string, number>();
  for (const u of users) userCounts.set(u.organizationId, (userCounts.get(u.organizationId) ?? 0) + 1);

  const programCounts = new Map<string, number>();
  for (const p of store.programs)
    programCounts.set(p.organizationId, (programCounts.get(p.organizationId) ?? 0) + 1);

  const projectCounts = new Map<string, number>();
  for (const p of store.projects)
    projectCounts.set(p.organizationId, (projectCounts.get(p.organizationId) ?? 0) + 1);

  const rows = orgs
    .filter((o) => o.id !== SUPERADMIN_ORG_ID)
    .map((o) => ({
      id: o.id,
      name: o.name,
      country: o.country,
      type: o.type,
      diocese: o.diocese,
      subscription: o.subscription,
      nextRenewalDiscountPct: o.nextRenewalDiscountPct,
      userCount: userCounts.get(o.id) ?? 0,
      programCount: programCounts.get(o.id) ?? 0,
      projectCount: projectCounts.get(o.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ organizations: rows });
}
