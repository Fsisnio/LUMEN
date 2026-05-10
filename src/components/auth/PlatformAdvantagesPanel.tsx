"use client";

import Link from "next/link";
import {
  Building2,
  FolderKanban,
  LineChart,
  MapPinned,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const ADV_ROWS: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: FolderKanban, titleKey: "auth.advProgramsTitle", descKey: "auth.advProgramsDesc" },
  { icon: MapPinned, titleKey: "auth.advGeoTitle", descKey: "auth.advGeoDesc" },
  { icon: LineChart, titleKey: "auth.advFinanceTitle", descKey: "auth.advFinanceDesc" },
  { icon: Shield, titleKey: "auth.advRiskTitle", descKey: "auth.advRiskDesc" },
  { icon: Sparkles, titleKey: "auth.advAiTitle", descKey: "auth.advAiDesc" },
  { icon: Building2, titleKey: "auth.advTenantTitle", descKey: "auth.advTenantDesc" },
];

export function PlatformAdvantagesPanel({ variant }: { variant: "login" | "signup" }) {
  const { t } = useLocale();

  const headline =
    variant === "login" ? t("auth.advantagesTitle") : t("auth.signupHeroTitle");
  const subline =
    variant === "login" ? t("auth.advantagesSubtitle") : t("auth.signupHeroBody");
  const contextLine = variant === "login" ? t("auth.heroBody") : null;
  const footerNote = variant === "signup" ? t("auth.signupHeroFootnote") : null;

  return (
    <div className="auth-hero-surface relative flex min-h-[min(100dvh,900px)] w-full flex-1 flex-col overflow-hidden lg:min-h-full">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative z-[1] flex flex-1 flex-col px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
        <div className="mb-10 max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-light)]">
            CARIPRIP · Lumen
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.15] text-white sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/75">{subline}</p>
          {contextLine ? (
            <p className="mt-4 border-l-2 border-[var(--accent)]/50 pl-4 text-sm italic leading-relaxed text-white/60">
              {contextLine}
            </p>
          ) : null}
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:gap-5">
          {ADV_ROWS.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="group rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm transition hover:border-[var(--accent)]/35 hover:bg-white/[0.09]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent-light)] ring-1 ring-[var(--accent)]/25 transition group-hover:bg-[var(--accent)]/30">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{t(descKey)}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-5 border-t border-white/10 pt-8">
          <p className="text-center text-xs font-medium tracking-wide text-white/55 sm:text-left">
            {t("auth.trustStrip")}
          </p>
          {footerNote ? <p className="text-center text-xs text-white/45 sm:text-left">{footerNote}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AuthBrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-3 ${className}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--navy)] shadow-md shadow-[var(--accent)]/25 ring-1 ring-black/5 transition group-hover:shadow-lg group-hover:shadow-[var(--accent)]/30">
        <span className="font-display text-2xl font-bold leading-none">L</span>
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight text-[var(--navy)]">Lumen</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">CARIPRIP</p>
      </div>
    </Link>
  );
}