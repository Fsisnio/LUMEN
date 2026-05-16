import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import {
  getFullStore,
  getOrganizations,
  listAllUsers,
} from "@/lib/data-store";
import { SUPERADMIN_ORG_ID } from "@/lib/superadmin-bootstrap";

const TIER_USD: Record<string, number> = {
  day_pass: 3,
  week_pass: 5,
  month_pass: 15,
};

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const [orgs, users, store] = await Promise.all([
    getOrganizations(),
    listAllUsers(),
    getFullStore(),
  ]);

  const visibleOrgs = orgs.filter((o) => o.id !== SUPERADMIN_ORG_ID);
  const visibleUsers = users.filter((u) => u.organizationId !== SUPERADMIN_ORG_ID);
  const now = Date.now();

  const activeSubs = visibleOrgs.filter(
    (o) => o.subscription && Date.parse(o.subscription.paidUntil) > now
  );
  const estimatedMrrUsd = activeSubs.reduce((sum, o) => {
    const tier = o.subscription?.tier ?? "free";
    return sum + (TIER_USD[tier] ?? 0);
  }, 0);

  const byTier = visibleOrgs.reduce(
    (acc, o) => {
      const tier = o.subscription && Date.parse(o.subscription.paidUntil) > now
        ? o.subscription.tier
        : "free";
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    },
    { free: 0, day_pass: 0, week_pass: 0, month_pass: 0 } as Record<string, number>
  );

  return NextResponse.json({
    counts: {
      organizations: visibleOrgs.length,
      users: visibleUsers.length,
      programs: store.programs.length,
      projects: store.projects.length,
      activeSubscriptions: activeSubs.length,
    },
    estimatedMrrUsd,
    byTier,
  });
}
