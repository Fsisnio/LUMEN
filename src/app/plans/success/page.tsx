"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { isProductionBuild } from "@/lib/build-mode";

function SuccessInner() {
  const router = useRouter();
  const { t } = useLocale();
  const { refresh } = useAuth();
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<"busy" | "ok" | "pending" | "fail">("busy");
  const [reason, setReason] = useState<string>("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token?.trim()) {
      setState("fail");
      setReason("missing_token");
      return;
    }

    const invoiceToken = token.trim();

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(
          `/api/paydunya/verify?token=${encodeURIComponent(invoiceToken)}`,
          { cache: "no-store", credentials: "include" }
        );
        const body = (await res.json()) as { ok?: boolean; reason?: string; configured?: boolean };
        if (cancelled) return;

        if (body.ok === true) {
          setState("ok");
          await refresh();
          return;
        }

        const r = typeof body.reason === "string" ? body.reason : "unknown";

        if (!res.ok) {
          setReason(r);
          setState("fail");
          return;
        }

        const statusPart = r.startsWith("status:") ? r.slice("status:".length).trim().toLowerCase() : "";
        if (statusPart === "pending") {
          setReason(r);
          setState("pending");
          return;
        }

        setReason(r);
        setState("fail");
      } catch {
        if (!cancelled) {
          setState("fail");
          setReason("network");
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, refresh, attempt]);

  const retryActivate = () => {
    setReason("");
    setState("busy");
    setAttempt((a) => a + 1);
  };

  const back = (
    <Link
      href="/plans"
      className="text-sm font-medium text-[var(--accent-dark)] underline-offset-4 hover:underline"
    >
      {t("plans.successBack")}
    </Link>
  );

  if (state === "busy") {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold text-[var(--navy)]">{t("plans.successTitle")}</h1>
        <p className="text-sm text-gray-600">{t("common.loading")}</p>
        {back}
      </div>
    );
  }

  if (state === "ok") {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold text-emerald-800">{t("plans.successThanks")}</h1>
        <p className="text-sm text-gray-700">{t("plans.successSynced")}</p>
        <div className="flex flex-wrap gap-4 pt-2">
          {back}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm font-medium text-[var(--navy)] underline-offset-4 hover:underline"
          >
            {t("plans.successDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold text-[var(--navy)]">{t("plans.successTitle")}</h1>
        <p className="text-sm text-gray-700">{t("plans.successPending")}</p>
        {!isProductionBuild() && reason ? (
          <p className="font-mono text-xs text-gray-500">{reason}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => retryActivate()}
            className="text-sm font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
          >
            {t("plans.tryActivateAgain")}
          </button>
          {back}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 p-6 sm:p-8">
      <h1 className="font-display text-xl font-semibold text-rose-700">{t("plans.successIssue")}</h1>
      <p className="text-sm text-gray-700">{t("plans.successFail")}</p>
      {reason && !isProductionBuild() ? (
        <p className="font-mono text-xs text-gray-500">{reason}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="button"
          onClick={() => retryActivate()}
          className="text-sm font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
        >
          {t("plans.tryActivateAgain")}
        </button>
        {back}
      </div>
    </div>
  );
}

export default function PlansSuccessPage() {
  const { t } = useLocale();
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8">
          <p className="text-sm text-gray-600">{t("common.loading")}</p>
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
