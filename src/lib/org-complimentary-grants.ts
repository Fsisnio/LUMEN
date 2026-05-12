import type { Organization } from "./types";
import { tierFromRank, tierRank } from "./subscription-offers";

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseOrgIdAllowlist(): Set<string> {
  const raw = process.env.ONEWORLD_BENIN_ORG_IDS ?? "";
  const ids = raw
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return new Set(ids);
}

/** ISO end of the complimentary month_pass window (15 USD tier). */
function complimentaryGrantUntilMs(): number {
  const fromEnv = process.env.ONEWORLD_BENIN_COMPLIMENTARY_UNTIL_ISO?.trim();
  const fallback = "2031-12-31T23:59:59.000Z";
  const iso = fromEnv && fromEnv.length > 0 ? fromEnv : fallback;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.parse(fallback);
}

export function isOneWorldBeninComplimentaryOrg(org: Organization): boolean {
  if (parseOrgIdAllowlist().has(org.id)) return true;

  const country = normalizeForMatch(org.country ?? "");
  const name = normalizeForMatch(org.name ?? "");
  const looksBenin = country.includes("benin") || name.includes("benin");
  const looksOneWorld =
    name.includes("oneworld") || name.includes("one world") || /\bone[\s-]*world\b/.test(name);
  return looksBenin && looksOneWorld;
}

/**
 * Virtual month_pass (15 USD tier) for OneWorld Benin until the configured date.
 * Does not persist; call sites that merge real PayDunya payments must use raw storage reads.
 */
export function applyComplimentaryMonthlyPassMerge(org: Organization): Organization {
  if (!isOneWorldBeninComplimentaryOrg(org)) return org;

  const now = Date.now();
  const grantUntilMs = complimentaryGrantUntilMs();
  if (grantUntilMs <= now) return org;

  const prev = org.subscription;
  const prevUntilMs = prev?.paidUntil ? Date.parse(prev.paidUntil) : NaN;
  const prevActive = Number.isFinite(prevUntilMs) && prevUntilMs > now;

  let nextUntilMs = grantUntilMs;
  let mergedRank = tierRank("month_pass");

  if (prevActive && prev) {
    nextUntilMs = Math.max(grantUntilMs, prevUntilMs);
    mergedRank = Math.max(mergedRank, tierRank(prev.tier));
  }

  return {
    ...org,
    subscription: {
      tier: tierFromRank(mergedRank),
      paidUntil: new Date(nextUntilMs).toISOString(),
    },
  };
}
