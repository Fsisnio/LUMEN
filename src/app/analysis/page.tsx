"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw, AlertCircle, Globe2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTenant } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";

export default function AnalysisPage() {
  return (
    <TenantGate>
      <AnalysisPageInner />
    </TenantGate>
  );
}

function AnalysisPageInner() {
  const { t, language } = useLocale();
  const { tenant, apiFetch } = useTenant();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setContent(null);
    setModel(null);
    try {
      const res = await apiFetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setContent(data.content ?? "");
      setModel(data.model ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

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
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {loading ? (
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
        </div>
      </header>

      <div className="p-8">
        {tenant && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
            <Globe2 className="h-3.5 w-3.5" />
            {tenant.name} · {tenant.country}
          </div>
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
