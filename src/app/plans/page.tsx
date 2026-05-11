"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { isProductionBuild } from "@/lib/build-mode";
import { SUBSCRIPTION_OFFERS, type OfferTierId } from "@/lib/subscription-offers";
import type { Organization } from "@/lib/types";

function offerNameKey(id: OfferTierId): string {
  const o = SUBSCRIPTION_OFFERS.find((x) => x.id === id);
  return o?.i18n.nameKey ?? "";
}

const PLANS_PAY_ERROR_PUBLIC_KEYS: Partial<Record<string, string>> = {
  "plans.configMissingPaydunya": "plans.payUnavailableUser",
  "plans.paydunyaCredMismatch": "plans.payFailedUser",
  "plans.paydunyaCheckoutFail": "plans.payFailedUser",
};

function localizedPlansCheckoutErrorMessage(key: string, t: (k: string) => string): string {
  if (!isProductionBuild()) return t(key);
  if (!key.startsWith("plans.")) return t(key);
  const mapped = PLANS_PAY_ERROR_PUBLIC_KEYS[key];
  return t(mapped ?? "plans.payFailedUser");
}

function hasActivePaidPass(org: Organization | null): boolean {
  const s = org?.subscription;
  if (!s?.paidUntil) return false;
  return Date.parse(s.paidUntil) > Date.now();
}

export default function PlansPage() {
  const { language, t } = useLocale();
  const { tenant, refresh } = useAuth();

  const [paydunyaOk, setPaydunyaOk] = useState<boolean | null>(null);
  const [busyTier, setBusyTier] = useState<OfferTierId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/paydunya/status", { cache: "no-store" });
        const body = (await res.json()) as { configured?: boolean };
        if (!cancelled) setPaydunyaOk(!!body.configured);
      } catch {
        if (!cancelled) setPaydunyaOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const localeTag = language === "fr" ? "fr-FR" : "en-US";

  const startCheckout = useCallback(
    async (tierId: Exclude<OfferTierId, "free">) => {
      setCheckoutError(null);
      setBusyTier(tierId);
      try {
        const res = await fetch("/api/paydunya/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tierId }),
        });
        const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; errorKey?: string };

        if (!res.ok) {
          if (res.status === 503) {
            setCheckoutError(localizedPlansCheckoutErrorMessage("plans.configMissingPaydunya", t));
            return;
          }
          if (typeof body.errorKey === "string" && body.errorKey.startsWith("plans.")) {
            const msg = localizedPlansCheckoutErrorMessage(body.errorKey, t);
            setCheckoutError(msg);
            return;
          }
          const raw =
            typeof body.error === "string" && body.error.trim()
              ? body.error
              : t("plans.checkoutFail");
          setCheckoutError(isProductionBuild() ? t("plans.payFailedUser") : raw);
          return;
        }

        if (typeof body.url === "string" && body.url.startsWith("http")) {
          window.location.href = body.url;
          return;
        }
        setCheckoutError(isProductionBuild() ? t("plans.payFailedUser") : t("plans.checkoutFail"));
      } catch (e) {
        setCheckoutError(
          isProductionBuild()
            ? t("plans.payFailedUser")
            : e instanceof Error
              ? e.message
              : t("plans.checkoutFail")
        );
      } finally {
        setBusyTier(null);
        void refresh();
      }
    },
    [refresh, t]
  );

  const paidActive = hasActivePaidPass(tenant);
  const sub = tenant?.subscription;
  const untilLabel =
    sub?.paidUntil && paidActive
      ? new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(sub.paidUntil)
        )
      : null;

  const payUnavailableCopy = isProductionBuild()
    ? t("plans.payUnavailableUser")
    : t("plans.configMissingPaydunya");

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-2">
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">{t("plans.title")}</h1>
        <p className="max-w-2xl text-sm text-gray-600">{t("plans.subtitle")}</p>
        {!isProductionBuild() ? (
          <>
            <p className="max-w-2xl text-xs text-gray-500">{t("plans.payCfAApprox")}</p>
            <p className="text-xs text-gray-500">{t("plans.note")}</p>
          </>
        ) : null}
        {typeof tenant?.nextRenewalDiscountPct === "number" && tenant.nextRenewalDiscountPct > 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
            {t("plans.discountNext").replace("{pct}", String(tenant.nextRenewalDiscountPct))}
          </p>
        ) : null}
        {paidActive && untilLabel && sub ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-gray-800 shadow-sm">
            <span className="font-semibold text-[var(--navy)]">{t("plans.activePass")}</span>:{" "}
            {offerNameKey(sub.tier) ? t(offerNameKey(sub.tier)) : sub.tier}
            {" — "}
            {t("plans.activeUntil").replace("{date}", untilLabel)}
          </div>
        ) : null}
        {checkoutError ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{checkoutError}</p>
        ) : null}
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_OFFERS.map((offer) => {
          const isFree = offer.id === "free";
          const { nameKey, priceKey, periodKey, taglineKey, featureKeys } = offer.i18n;
          const isBusy = busyTier === offer.id;
          const canPay = !isFree && paydunyaOk === true;

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
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-dark)]" strokeWidth={2.5} />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isFree ? (
                  <button
                    type="button"
                    disabled
                    title={t("plans.cta.free")}
                    className="w-full cursor-default rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    {t("plans.cta.free")}
                  </button>
                ) : paydunyaOk === false ? (
                  <button
                    type="button"
                    disabled
                    title={payUnavailableCopy}
                    className="w-full cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500"
                  >
                    {payUnavailableCopy}
                  </button>
                ) : paydunyaOk === null ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)]/50 px-4 py-2.5 text-sm font-semibold text-[var(--navy)] opacity-75"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canPay || isBusy}
                    onClick={() => {
                      if (offer.id === "free") return;
                      void startCheckout(offer.id);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--navy)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isBusy ? t("plans.checkoutBusy") : t("plans.payWithPaydunya")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
