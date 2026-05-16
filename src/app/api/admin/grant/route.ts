import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import { getOrganization, updateOrganization } from "@/lib/data-store";
import { paidTierDurationMs, tierFromRank, tierRank } from "@/lib/subscription-offers";
import type { OfferTierId } from "@/lib/subscription-offers";

const PAYABLE_TIERS: Exclude<OfferTierId, "free">[] = ["day_pass", "week_pass", "month_pass"];

function isPayableTier(x: unknown): x is Exclude<OfferTierId, "free"> {
  return typeof x === "string" && (PAYABLE_TIERS as string[]).includes(x);
}

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orgId, tier, days } = (body ?? {}) as {
    orgId?: string;
    tier?: string;
    days?: number;
  };

  if (!orgId?.trim()) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }
  if (!isPayableTier(tier)) {
    return NextResponse.json(
      { error: "tier must be one of day_pass, week_pass, month_pass" },
      { status: 400 }
    );
  }

  const org = await getOrganization(orgId, { skipComplimentaryMerge: true });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const now = Date.now();
  const prevUntilMs = org.subscription?.paidUntil ? Date.parse(org.subscription.paidUntil) : NaN;
  const prevActive = Number.isFinite(prevUntilMs) && prevUntilMs > now;

  const grantMs =
    typeof days === "number" && Number.isFinite(days) && days > 0
      ? Math.min(days, 365) * 24 * 60 * 60 * 1000
      : paidTierDurationMs(tier);

  const baseMs = prevActive ? prevUntilMs : now;
  const newUntilIso = new Date(baseMs + grantMs).toISOString();

  const prevRank = prevActive && org.subscription ? tierRank(org.subscription.tier) : 0;
  const mergedTier = tierFromRank(Math.max(prevRank, tierRank(tier)));

  const saved = await updateOrganization(orgId, {
    subscription: { tier: mergedTier, paidUntil: newUntilIso },
  });

  if (!saved) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ ok: true, subscription: saved.subscription });
}
