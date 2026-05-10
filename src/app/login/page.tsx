"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, AlertCircle, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { AuthBrandMark, PlatformAdvantagesPanel } from "@/components/auth/PlatformAdvantagesPanel";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-[var(--accent-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/12";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center auth-form-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-[var(--accent)]/30" />
        <p className="text-sm text-gray-500">Lumen</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { signIn } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(next.startsWith("/") ? next : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="grid min-h-dvh w-full grid-cols-1 bg-[var(--navy)] [grid-template-rows:auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_clamp(380px,36vw,460px)] lg:grid-rows-1 lg:[grid-template-rows:1fr]"
    >
      {/* Petit écran : formulaire d’abord. Web (≥lg) : colonne droite, hauteur viewport. */}
      <main className="auth-form-surface col-span-1 row-start-1 flex w-full shrink-0 flex-col justify-center border-[var(--border)]/70 px-6 py-11 sm:px-10 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-full lg:max-h-none lg:min-h-dvh lg:border-l lg:py-14 lg:[box-shadow:inset_1px_0_0_rgb(232,230,225)]">
        <div className="mx-auto w-full max-w-md pb-6 md:pb-0">
          <AuthBrandMark className="mb-8" />

          <div className="rounded-[1.75rem] border border-white/70 bg-[var(--card)]/95 p-8 shadow-[0_32px_64px_-28px_rgba(26,31,46,0.35)] backdrop-blur-md sm:p-10">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent-dark)]">
                <ClipboardList className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--navy)] sm:text-[1.65rem]">
                  {t("auth.signInTitle")}
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                  {t("auth.signInSubtitle")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-white px-4 py-3 text-sm text-rose-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-800">
                  {t("auth.email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-gray-800">
                  {t("auth.password")}
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--navy)] shadow-lg shadow-[var(--accent)]/25 ring-1 ring-black/[0.04] transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/30 disabled:pointer-events-none disabled:opacity-55"
              >
                <LogIn className="h-4 w-4" strokeWidth={2} />
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </button>

              <p className="text-center text-sm text-gray-600">
                {t("auth.noAccount")}{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
                >
                  {t("auth.signUp")}
                </Link>
              </p>
            </form>

            <div className="mt-8 rounded-2xl border border-dashed border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-[#faf9f6] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/70">
                {t("auth.demoLabel")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{t("auth.demoHint")}</p>
              <ul className="mt-3 space-y-2 font-mono text-[11px] leading-snug text-gray-800 sm:text-xs">
                <li className="flex flex-wrap gap-x-1 gap-y-1">
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">admin@caritas-senegal.org</span>
                  <span className="text-gray-400">·</span>
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">caritas123</span>
                </li>
                <li className="flex flex-wrap gap-x-1 gap-y-1">
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">admin@caritas-mali.org</span>
                  <span className="text-gray-400">·</span>
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">caritas123</span>
                </li>
                <li className="flex flex-wrap gap-x-1 gap-y-1">
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">admin@caritas-bf.org</span>
                  <span className="text-gray-400">·</span>
                  <span className="rounded bg-white/80 px-1.5 py-0.5 ring-1 ring-amber-100">caritas123</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile: bloc avantages après le formulaire. Web: colonne gauche fond navy. */}
      <aside className="col-span-1 row-start-2 flex min-h-0 flex-col lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-dvh lg:max-w-none">
        <PlatformAdvantagesPanel variant="login" />
      </aside>
    </div>
  );
}
