import type { Organization } from "./types";
import type { PaydunyaConfirmPayload, PaydunyaSecrets } from "./paydunya-client";
import {
  extractInvoiceToken,
  verifyPaydunyaMasterKeyHash,
  resolveConfirmPayload,
  confirmCheckoutInvoice,
} from "./paydunya-client";
import {
  tierFromRank,
  tierRank,
  paidTierDurationMs,
  parsePayableTier,
  type OfferTierId,
} from "./subscription-offers";
import { getOrganization, updateOrganization } from "./data-store";

export function applyDiscountCfa(listedCfa: number, discountPct: number | undefined): number {
  const pct = typeof discountPct === "number" && Number.isFinite(discountPct) ? discountPct : 0;
  const clamped = Math.min(99, Math.max(0, pct));
  return Math.max(150, Math.round((listedCfa * (100 - clamped)) / 100));
}

/** Merge subscription after a successful PayDunya invoice (idempotent per invoice token). */
export function computeSubscriptionPatch(
  org: Organization,
  tier: Exclude<OfferTierId, "free">,
  invoiceToken: string
): Partial<Organization> {
  const tokens = org.paydunyaCompletedTokens ?? [];
  if (tokens.includes(invoiceToken)) {
    return {};
  }

  const now = Date.now();
  const prev = org.subscription;
  const prevUntilMs = prev?.paidUntil ? Date.parse(prev.paidUntil) : NaN;
  const prevActive = Number.isFinite(prevUntilMs) && prevUntilMs > now;
  const prevRank = prevActive && prev ? tierRank(prev.tier) : 0;

  const baseMs = prevActive ? prevUntilMs : now;
  const newUntil = new Date(baseMs + paidTierDurationMs(tier));

  const mergedRank = Math.max(prevRank, tierRank(tier));
  const mergedTier = tierFromRank(mergedRank);

  const patch: Partial<Organization> = {
    subscription: {
      tier: mergedTier,
      paidUntil: newUntil.toISOString(),
    },
    paydunyaCompletedTokens: [...tokens, invoiceToken].slice(-120),
  };

  return patch;
}

export async function fulfillPaydunyaInvoice(params: {
  secrets: PaydunyaSecrets;
  payload: PaydunyaConfirmPayload;
  /** If set, reject fulfillments for other orgs (browser return flow). */
  expectedOrgId?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { secrets, expectedOrgId } = params;
  let payload = await resolveConfirmPayload(secrets, params.payload);

  if (!payload.hash || !verifyPaydunyaMasterKeyHash(secrets, payload.hash)) {
    const tok = extractInvoiceToken(payload);
    if (!tok) return { ok: false, reason: "invalid_hash" };
    payload = await confirmCheckoutInvoice(secrets, tok);
  }
  if (!payload.hash || !verifyPaydunyaMasterKeyHash(secrets, payload.hash)) {
    return { ok: false, reason: "invalid_hash" };
  }

  const status = String(payload.status ?? "").toLowerCase();
  if (status !== "completed") {
    return { ok: false, reason: `status:${status || "unknown"}` };
  }

  const tierRaw = payload.custom_data?.tier ?? payload.custom_data?.tier_id;
  const tier = typeof tierRaw === "string" ? parsePayableTier(tierRaw) : null;
  if (!tier) {
    return { ok: false, reason: "missing_tier" };
  }

  const orgRaw = payload.custom_data?.org_id ?? payload.custom_data?.organization_id;
  const orgId = typeof orgRaw === "string" ? orgRaw.trim() : "";
  if (!orgId) {
    return { ok: false, reason: "missing_org" };
  }

  if (expectedOrgId && expectedOrgId !== orgId) {
    return { ok: false, reason: "org_mismatch" };
  }

  const expectedStr = payload.custom_data?.expected_cfa;
  const total = payload.invoice?.total_amount;
  const totalNum =
    typeof total === "number"
      ? total
      : typeof total === "string"
        ? Number(total)
        : NaN;
  const expectedNum = typeof expectedStr === "string" ? Number(expectedStr) : NaN;
  if (
    Number.isFinite(totalNum) &&
    Number.isFinite(expectedNum) &&
    Math.round(totalNum) !== Math.round(expectedNum)
  ) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const org = await getOrganization(orgId);
  if (!org) {
    return { ok: false, reason: "org_not_found" };
  }

  const invToken = extractInvoiceToken(payload);
  if (!invToken) {
    return { ok: false, reason: "missing_invoice_token" };
  }

  const patch = computeSubscriptionPatch(org, tier, invToken);
  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  /** One-time rebate: clearing after any successful paid pass except a new Month pass (re-grants 20%). */
  const merged: Partial<Organization> = { ...patch };

  const discRaw = payload.custom_data?.discount_applied_pct;
  const discountUsed =
    typeof discRaw === "string" &&
    Number.isFinite(Number(discRaw)) &&
    Number.parseInt(discRaw, 10) > 0;

  if (discountUsed) {
    merged.nextRenewalDiscountPct = undefined;
  }

  if (tier === "month_pass") {
    merged.nextRenewalDiscountPct = 20;
  }

  await updateOrganization(orgId, merged);
  return { ok: true };
}
