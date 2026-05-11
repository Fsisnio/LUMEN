/** Commercial offer tiers (display + future billing enforcement). Prices in USD unless noted. */
export type OfferTierId = "free" | "day_pass" | "week_pass" | "month_pass";

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
].sort((a, b) => a.order - b.order);
