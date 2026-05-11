import type { Organization, OrganizationSubscriptionUsage } from "./types";
import { tierRank, type OfferTierId } from "./subscription-offers";

export type AnalysisRunKind = "analysis" | "report";

/** Current commercial tier for feature gating (falls back to free when pass expired). */
export function resolveEffectiveTier(org: Organization): OfferTierId {
  const s = org.subscription;
  if (!s?.paidUntil) return "free";
  if (Date.parse(s.paidUntil) <= Date.now()) return "free";
  return s.tier;
}

export function entitlementSnapshot(org: Organization): string {
  const s = org.subscription;
  const tier = resolveEffectiveTier(org);
  const until = tier === "free" ? "-" : (s?.paidUntil ?? "-");
  return `${tier}:${until}`;
}

function utcYm(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

function utcYmd(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Monday UTC as YYYY-MM-DD for week-bucketed quotas. */
function mondayUtcYmd(d = new Date()): string {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = new Date(t).getUTCDay(); // Sun=0 … Sat=6
  const delta = dow === 0 ? -6 : 1 - dow;
  const m = new Date(t + delta * 86_400_000);
  return m.toISOString().slice(0, 10);
}

function clampUsage(u: OrganizationSubscriptionUsage | undefined): OrganizationSubscriptionUsage {
  return {
    ...(u ?? {}),
  };
}

/**
 * Applies entitlement snapshot rollover (clears pass-scoped totals when tier / expiry changes).
 * Returns mutated clone.
 */
export function reconcileEntitlementCounters(
  org: Organization,
  usageIn: OrganizationSubscriptionUsage
): OrganizationSubscriptionUsage {
  const usage = clampUsage({ ...usageIn });
  const snap = entitlementSnapshot(org);
  if (usage.entitlementSnapshot !== snap) {
    usage.entitlementSnapshot = snap;
    usage.passAiTotal = 0;
    usage.passReportTotal = 0;
    usage.paidAiDay = undefined;
  }
  return usage;
}

const LIMITS = {
  freeAiPerMonth: 1,
  dayPassAiTotal: 3,
  dayPassReportTotal: 1,
  weekAiPerUtcDay: 5,
  weekReportsPerWeek: 4,
  monthAiPerUtcDay: 10,
  monthReportsPerMonth: 10,
} as const;

export interface QuotaCheckResult {
  ok: boolean;
  code?: string;
  /** Next usage after a successful consumption (only when ok). */
  nextUsage?: OrganizationSubscriptionUsage;
}

export function peekAiQuota(org: Organization, kind: AnalysisRunKind): QuotaCheckResult {
  return mutateUsage(org, kind, /* dryRun */ true);
}

/**
 * Validates and returns next `subscriptionUsage` after incrementing counters.
 * Pass `dryRun` to only validate without incrementing.
 */
export function mutateUsage(
  org: Organization,
  kind: AnalysisRunKind,
  dryRun: boolean
): QuotaCheckResult {
  const tier = resolveEffectiveTier(org);
  let usage = reconcileEntitlementCounters(org, org.subscriptionUsage ?? {});

  if (kind === "report" && tier === "free") {
    return { ok: false, code: "quota_report_free" };
  }

  if (kind === "report") {
    const res = consumeReport(tier, usage, dryRun);
    if (!res.ok) return res;
    usage = res.nextUsage!;
    return { ok: true, nextUsage: usage };
  }

  const res = consumeAi(tier, usage, dryRun);
  if (!res.ok) return res;
  return { ok: true, nextUsage: res.nextUsage };
}

function consumeAi(
  tier: OfferTierId,
  usage: OrganizationSubscriptionUsage,
  dryRun: boolean
): QuotaCheckResult {
  const u = { ...usage };

  if (tier === "free") {
    const ym = utcYm();
    const current = u.freeAi?.period === ym ? u.freeAi.count : 0;
    if (current >= LIMITS.freeAiPerMonth) {
      return { ok: false, code: "quota_free_ai_month", nextUsage: u };
    }
    if (!dryRun) {
      u.freeAi = { period: ym, count: current + 1 };
    }
    return { ok: true, nextUsage: u };
  }

  if (tier === "day_pass") {
    const n = u.passAiTotal ?? 0;
    if (n >= LIMITS.dayPassAiTotal) return { ok: false, code: "quota_day_pass_ai", nextUsage: u };
    if (!dryRun) u.passAiTotal = n + 1;
    return { ok: true, nextUsage: u };
  }

  if (tier === "week_pass" || tier === "month_pass") {
    const day = utcYmd();
    const cap = tier === "week_pass" ? LIMITS.weekAiPerUtcDay : LIMITS.monthAiPerUtcDay;
    const current = u.paidAiDay?.period === day ? u.paidAiDay.count : 0;
    if (current >= cap) {
      return { ok: false, code: tier === "week_pass" ? "quota_week_ai_day" : "quota_month_ai_day", nextUsage: u };
    }
    if (!dryRun) {
      u.paidAiDay = { period: day, count: current + 1 };
    }
    return { ok: true, nextUsage: u };
  }

  return { ok: false, code: "quota_unknown_tier", nextUsage: u };
}

function consumeReport(
  tier: OfferTierId,
  usage: OrganizationSubscriptionUsage,
  dryRun: boolean
): QuotaCheckResult {
  const u = { ...usage };

  if (tier === "day_pass") {
    const n = u.passReportTotal ?? 0;
    if (n >= LIMITS.dayPassReportTotal) {
      return { ok: false, code: "quota_day_pass_report", nextUsage: u };
    }
    if (!dryRun) u.passReportTotal = n + 1;
    return { ok: true, nextUsage: u };
  }

  if (tier === "week_pass") {
    const wk = mondayUtcYmd();
    const current = u.reportWeek?.period === wk ? u.reportWeek.count : 0;
    if (current >= LIMITS.weekReportsPerWeek) {
      return { ok: false, code: "quota_week_report", nextUsage: u };
    }
    if (!dryRun) {
      u.reportWeek = { period: wk, count: current + 1 };
    }
    return { ok: true, nextUsage: u };
  }

  if (tier === "month_pass") {
    const ym = utcYm();
    const current = u.reportMonth?.period === ym ? u.reportMonth.count : 0;
    if (current >= LIMITS.monthReportsPerMonth) {
      return { ok: false, code: "quota_month_report", nextUsage: u };
    }
    if (!dryRun) {
      u.reportMonth = { period: ym, count: current + 1 };
    }
    return { ok: true, nextUsage: u };
  }

  return { ok: false, code: "quota_report_tier", nextUsage: u };
}

/** Week pass and above (active paid) unlock advanced geo filters. */
export function canUseAdvancedGeoFilters(org: Organization | null): boolean {
  if (!org) return false;
  const tier = resolveEffectiveTier(org);
  return tier !== "free" && tierRank(tier) >= tierRank("week_pass");
}

export interface QuotaSnapshot {
  effectiveTier: OfferTierId;
  advancedGeo: boolean;
  ai: {
    kind: AnalysisRunKind;
    limit: number;
    usedThisWindow: number;
    windowLabel: string;
    allowed: boolean;
  };
  report: {
    limit: number;
    usedThisWindow: number;
    windowLabel: string;
    allowed: boolean;
  };
}

function peekWindows(org: Organization) {
  const tier = resolveEffectiveTier(org);
  const usage = reconcileEntitlementCounters(org, org.subscriptionUsage ?? {});

  let aiUsed = 0;
  let aiLimit = Infinity;
  let aiWindow = "—";

  if (tier === "free") {
    const ym = utcYm();
    aiUsed = usage.freeAi?.period === ym ? usage.freeAi.count : 0;
    aiLimit = LIMITS.freeAiPerMonth;
    aiWindow = ym;
  } else if (tier === "day_pass") {
    aiUsed = usage.passAiTotal ?? 0;
    aiLimit = LIMITS.dayPassAiTotal;
    aiWindow = entitlementSnapshot(org);
  } else if (tier === "week_pass" || tier === "month_pass") {
    const day = utcYmd();
    aiUsed = usage.paidAiDay?.period === day ? usage.paidAiDay.count : 0;
    aiLimit = tier === "week_pass" ? LIMITS.weekAiPerUtcDay : LIMITS.monthAiPerUtcDay;
    aiWindow = day;
  }

  let rpUsed = 0;
  let rpLimit = 0;
  let rpWindow = "—";

  if (tier === "day_pass") {
    rpUsed = usage.passReportTotal ?? 0;
    rpLimit = LIMITS.dayPassReportTotal;
    rpWindow = entitlementSnapshot(org);
  } else if (tier === "week_pass") {
    const wk = mondayUtcYmd();
    rpUsed = usage.reportWeek?.period === wk ? usage.reportWeek.count : 0;
    rpLimit = LIMITS.weekReportsPerWeek;
    rpWindow = wk;
  } else if (tier === "month_pass") {
    const ym = utcYm();
    rpUsed = usage.reportMonth?.period === ym ? usage.reportMonth.count : 0;
    rpLimit = LIMITS.monthReportsPerMonth;
    rpWindow = ym;
  }

  const aiPeek = peekAiQuota(org, "analysis");
  const rpPeek = peekAiQuota(org, "report");

  return {
    tier,
    usage,
    aiUsed,
    aiLimit: Number.isFinite(aiLimit) ? aiLimit : 0,
    aiWindow,
    rpUsed,
    rpLimit,
    rpWindow,
    aiAllowed: aiPeek.ok,
    reportAllowed: rpPeek.ok && tier !== "free",
  };
}

export function getQuotaSnapshot(org: Organization): QuotaSnapshot {
  const peek = peekWindows(org);
  return {
    effectiveTier: peek.tier,
    advancedGeo: canUseAdvancedGeoFilters(org),
    ai: {
      kind: "analysis",
      limit: peek.aiLimit,
      usedThisWindow: peek.aiUsed,
      windowLabel: peek.aiWindow,
      allowed: peek.aiAllowed,
    },
    report: {
      limit: peek.rpLimit,
      usedThisWindow: peek.rpUsed,
      windowLabel: peek.rpWindow,
      allowed: peek.reportAllowed,
    },
  };
}
