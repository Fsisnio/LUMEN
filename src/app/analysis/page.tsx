"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw, AlertCircle, Globe2, FileText } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import type { QuotaSnapshot } from "@/lib/subscription-quota";

function tierNameKey(id: string): string {
  const m: Record<string, string> = {
    free: "plans.offerFree.name",
    day_pass: "plans.offerDay.name",
    week_pass: "plans.offerWeek.name",
    month_pass: "plans.offerMonth.name",
  };
  return m[id] ?? m.free;
}

function displayErrorFromPayload(payload: Record<string, unknown>, t: (k: string) => string): string {
  const raw = typeof payload.error === "string" ? payload.error : "";
  if (raw.startsWith("analysis.")) return t(raw);
  return raw || "HTTP error";
}

export default function AnalysisPage() {
  return (
    <TenantGate>
      <AnalysisPageInner />
    </TenantGate>
  );
}

function AnalysisPageInner() {
  const { t, language } = useLocale();
  const { tenant, apiFetch, refreshTenants } = useTenant();
  const [quota, setQuota] = useState<QuotaSnapshot | null>(null);
  const [lastQuotaViolation, setLastQuotaViolation] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<"analysis" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const res = await apiFetch("/api/subscription/quota", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as QuotaSnapshot;
      setQuota(data);
    } catch {
      /* ignore */
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota, tenant?.id]);

  const runGeneration = async (mode: "analysis" | "report") => {
    setLoading(true);
    setLoadingKind(mode);
    setLastQuotaViolation(null);
    setError(null);
    setContent(null);
    setModel(null);
    try {
      const res = await apiFetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, mode }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        if (typeof data.quotaCode === "string") setLastQuotaViolation(data.quotaCode);
        setError(displayErrorFromPayload(data, t));
        return;
      }
      setContent(typeof data.content === "string" ? data.content : "");
      setModel(typeof data.model === "string" ? data.model : null);
      void loadQuota();
      void refreshTenants();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };

  const aiLimited = quota !== null && !quota.ai.allowed;
  const reportLimited = quota !== null && !quota.report.allowed;
  const fmtPair = (used: number, limit: number) =>
    limit > 0 ? t("analysis.quotaOf").replace("{used}", String(used)).replace("{limit}", String(limit)) : "—";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display flex items-center gap-2 text-3xl font-semibold text-[var(--navy)]">
              <Sparkles className="h-8 w-8 text-[var(--accent-dark)]" />
              {t("analysis.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-gray-600">{t("analysis.subtitle")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void runGeneration("analysis")}
              disabled={loading || quota === null || aiLimited}
              title={aiLimited ? t("analysis.quotaExceeded") : undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && loadingKind === "analysis" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("analysis.running")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("analysis.run")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void runGeneration("report")}
              disabled={loading || quota === null || reportLimited}
              title={reportLimited ? t("analysis.quotaReportFree") : undefined}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-dark)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && loadingKind === "report" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("analysis.runningReport")}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  {t("analysis.runReport")}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        {tenant && (
          <div className="mb-4 inline-flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs text-gray-700 shadow-sm">
            <Globe2 className="h-4 w-4 shrink-0 text-[var(--accent-dark)]" aria-hidden />
            <span className="font-semibold">{tenant.name}</span>
            <span className="text-gray-500">·</span>
            <span>{tenant.country}</span>
          </div>
        )}

        {quota ? (
          <div className="mb-6 grid gap-4 rounded-xl border border-[var(--border)] bg-gray-50/80 px-5 py-4 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t("analysis.quotaPlan")}
              </p>
              <p className="font-medium text-[var(--navy)]">{t(tierNameKey(quota.effectiveTier))}</p>
              <p className="text-xs text-gray-600">
                <strong>{t("analysis.quotaAi")}:</strong>{" "}
                {fmtPair(quota.ai.usedThisWindow, quota.ai.limit)} ({quota.ai.windowLabel})
              </p>
              <p className="text-xs text-gray-600">
                <strong>{t("analysis.quotaReports")}:</strong>{" "}
                {fmtPair(quota.report.usedThisWindow, quota.report.limit)} ({quota.report.windowLabel})
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-gray-600 md:border-l md:border-t-0 md:pt-0 md:pl-5">
              {!quota.advancedGeo && (
                <p>{t("analysis.quotaUnlimitedGeo")}</p>
              )}
              {quota.advancedGeo ? (
                <p className="text-emerald-800">{t("analysis.geoAdvancedIncluded")}</p>
              ) : null}
              <Link
                href="/plans"
                className="inline-flex w-fit text-[var(--accent-dark)] underline-offset-4 hover:underline"
              >
                {t("nav.plans")} →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-500">{t("common.loading")}</div>
        )}

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{t("analysis.envHint")}</p>
          <p className="mt-1 text-amber-800/90">{t("analysis.envDetail")}</p>
        </div>

        {error && (
          <div className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">{t("analysis.errorTitle")}</p>
              <p className="mt-1 text-sm">{error}</p>
              {typeof lastQuotaViolation === "string" && lastQuotaViolation.startsWith("quota_") ? (
                <Link
                  href="/plans"
                  className="mt-2 inline-block text-sm font-medium text-rose-900 underline-offset-4 hover:underline"
                >
                  {t("nav.plans")} →
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {content && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
            {model && (
              <p className="mb-6 border-b border-[var(--border)] pb-4 text-xs text-gray-500">
                {t("analysis.modelLabel")}: {model}
              </p>
            )}
            <article className="markdown-analysis max-w-none text-gray-800">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="mt-8 border-b border-[var(--border)] pb-2 font-display text-xl font-semibold text-[var(--navy)] first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-5 font-display text-lg font-semibold text-[var(--navy)]">{children}</h3>
                  ),
                  p: ({ children }) => <p className="mt-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>,
                  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--navy)]">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-[var(--accent-dark)] underline hover:no-underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}

        {!content && !loading && !error && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-gray-50/50 px-8 py-16 text-center text-gray-500">
            <Sparkles className="mx-auto h-12 w-12 text-[var(--accent)]/40" />
            <p className="mt-4 font-medium text-gray-700">{t("analysis.emptyTitle")}</p>
            <p className="mt-1 text-sm">{t("analysis.emptyHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
