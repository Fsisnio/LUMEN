/** Commercial offer tiers (display + future billing enforcement). Prices in USD unless noted. */
export type OfferTierId = "free" | "day_pass" | "week_pass" | "month_pass";

const DAY_MS = 24 * 60 * 60 * 1000;

const PAID_USD: Record<Exclude<OfferTierId, "free">, number> = {
  day_pass: 3,
  week_pass: 5,
  month_pass: 15,
};

export function tierRank(id: OfferTierId): number {
  switch (id) {
    case "free":
      return 0;
    case "day_pass":
      return 1;
    case "week_pass":
      return 2;
    case "month_pass":
      return 3;
  }
}

export function tierFromRank(rank: number): OfferTierId {
  if (rank >= 3) return "month_pass";
  if (rank >= 2) return "week_pass";
  if (rank >= 1) return "day_pass";
  return "free";
}

export function paidTierDurationMs(id: Exclude<OfferTierId, "free">): number {
  switch (id) {
    case "day_pass":
      return DAY_MS;
    case "week_pass":
      return 7 * DAY_MS;
    case "month_pass":
      return 30 * DAY_MS;
  }
}

/**
 * PayDunya invoices are in CFA (XOF). We convert from the published USD list
 * price using `PAYDUNYA_XOF_PER_USD` (default 610).
 */
export function paydunyaListedAmountCfa(id: Exclude<OfferTierId, "free">): number {
  const rate = Number(process.env.PAYDUNYA_XOF_PER_USD ?? 610);
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 610;
  const rounded = Math.round(PAID_USD[id] * safeRate);
  return Math.max(rounded, 150);
}

export interface SubscriptionOfferDef {
  id: OfferTierId;
  /** Highlight this card in the UI */
  recommended?: boolean;
  /** Sort order on the pricing page */
  order: number;
  i18n: {
    nameKey: string;
    priceKey: string;
    /** e.g. “per day”, “per month” */
    periodKey: string;
    taglineKey: string;
    featureKeys: string[];
  };
}

export const SUBSCRIPTION_OFFERS: SubscriptionOfferDef[] = [
  {
    id: "free",
    order: 1,
    i18n: {
      nameKey: "plans.offerFree.name",
      priceKey: "plans.offerFree.price",
      periodKey: "plans.offerFree.period",
      taglineKey: "plans.offerFree.tagline",
      featureKeys: [
        "plans.offerFree.f1",
        "plans.offerFree.f2",
        "plans.offerFree.f3",
        "plans.offerFree.f4",
        "plans.offerFree.f5",
      ],
    },
  },
  {
    id: "day_pass",
    order: 2,
    i18n: {
      nameKey: "plans.offerDay.name",
      priceKey: "plans.offerDay.price",
      periodKey: "plans.offerDay.period",
      taglineKey: "plans.offerDay.tagline",
      featureKeys: [
        "plans.offerDay.f1",
        "plans.offerDay.f2",
        "plans.offerDay.f3",
        "plans.offerDay.f4",
      ],
    },
  },
  {
    id: "week_pass",
    order: 3,
    recommended: true,
    i18n: {
      nameKey: "plans.offerWeek.name",
      priceKey: "plans.offerWeek.price",
      periodKey: "plans.offerWeek.period",
      taglineKey: "plans.offerWeek.tagline",
      featureKeys: [
        "plans.offerWeek.f1",
        "plans.offerWeek.f2",
        "plans.offerWeek.f3",
        "plans.offerWeek.f4",
        "plans.offerWeek.f5",
      ],
    },
  },
  {
    id: "month_pass",
    order: 4,
    i18n: {
      nameKey: "plans.offerMonth.name",
      priceKey: "plans.offerMonth.price",
      periodKey: "plans.offerMonth.period",
      taglineKey: "plans.offerMonth.tagline",
      featureKeys: [
        "plans.offerMonth.f1",
        "plans.offerMonth.f2",
        "plans.offerMonth.f3",
        "plans.offerMonth.f4",
        "plans.offerMonth.f5",
      ],
    },
  },
].sort((a, b) => a.order - b.order) as SubscriptionOfferDef[];

export function parsePayableTier(raw: string): Exclude<OfferTierId, "free"> | null {
  const n = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (n === "day_pass" || n === "week_pass" || n === "month_pass") return n;
  return null;
}
