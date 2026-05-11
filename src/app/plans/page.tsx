"use client";

import { Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { SUBSCRIPTION_OFFERS } from "@/lib/subscription-offers";

export default function PlansPage() {
  const { t } = useLocale();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-2">
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">{t("plans.title")}</h1>
        <p className="max-w-2xl text-sm text-gray-600">{t("plans.subtitle")}</p>
        <p className="text-xs text-gray-500">{t("plans.note")}</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_OFFERS.map((offer) => {
          const isFree = offer.id === "free";
          const { nameKey, priceKey, periodKey, taglineKey, featureKeys } = offer.i18n;
          return (
            <div
              key={offer.id}
              className={`relative flex flex-col rounded-2xl border bg-[var(--card)] p-6 shadow-sm ${
                offer.recommended
                  ? "border-[var(--accent-dark)] ring-2 ring-[var(--accent)]/35"
                  : "border-[var(--border)]"
              }`}
            >
              {offer.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--navy)]">
                  {t("plans.popular")}
                </span>
              )}
              <h2 className="font-display text-lg font-semibold text-[var(--navy)]">{t(nameKey)}</h2>
              <p className="mt-1 text-xs text-gray-500">{t(taglineKey)}</p>
              <div className="mt-5 flex flex-wrap items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-[var(--navy)]">{t(priceKey)}</span>
              </div>
              <p className="text-xs font-medium text-gray-600">{t(periodKey)}</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
                {featureKeys.map((key) => (
                  <li key={key} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-dark)]"
                      strokeWidth={2.5}
                    />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <button
                  type="button"
                  disabled
                  title={isFree ? t("plans.cta.free") : t("plans.cta.paid")}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity ${
                    isFree
                      ? "cursor-default bg-gray-100 text-gray-700"
                      : "cursor-not-allowed bg-[var(--accent)]/70 text-[var(--navy)] opacity-85"
                  }`}
                >
                  {isFree ? t("plans.cta.free") : t("plans.cta.paid")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
