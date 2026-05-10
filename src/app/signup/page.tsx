"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, AlertCircle, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { COUNTRIES } from "@/lib/countries";
import type { Organization } from "@/lib/types";
import { AuthBrandMark, PlatformAdvantagesPanel } from "@/components/auth/PlatformAdvantagesPanel";

const ORG_TYPES: Organization["type"][] = [
  "National Office",
  "Diocesan Branch",
  "Regional Coordination",
];

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-[var(--accent-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/12";

const selectClass =
  "w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm shadow-sm focus:border-[var(--accent-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/12";

export default function SignupPage() {
  const { signUp } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<Organization["type"]>("National Office");
  const [country, setCountry] = useState("Senegal");
  const [region, setRegion] = useState("");
  const [diocese, setDiocese] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await signUp({
        organization: {
          name: orgName.trim(),
          type: orgType,
          country,
          region: region.trim() || undefined,
          diocese: diocese.trim() || undefined,
        },
        user: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh w-full grid-cols-1 bg-[var(--navy)] [grid-template-rows:auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_clamp(400px,40vw,32rem)] lg:grid-rows-1 lg:[grid-template-rows:1fr]">
      <main className="auth-form-surface col-span-1 row-start-1 flex w-full shrink-0 flex-col justify-center px-6 py-12 sm:px-10 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-full lg:max-h-none lg:min-h-dvh lg:border-l lg:border-[var(--border)]/80 lg:px-10 xl:px-14 lg:[box-shadow:inset_1px_0_0_rgb(232,230,225)]">
        <div className="mx-auto w-full max-w-xl pb-8 lg:pb-0">
          <AuthBrandMark className="mb-8" />

          <div className="rounded-[1.75rem] border border-white/70 bg-[var(--card)]/95 p-8 shadow-[0_32px_64px_-28px_rgba(26,31,46,0.35)] backdrop-blur-md sm:p-10">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent-dark)]">
                <Building2 className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--navy)] sm:text-[1.65rem]">
                  {t("auth.signUpTitle")}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-600">
                  {t("auth.signUpSubtitle")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {error && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-white px-4 py-3 text-sm text-rose-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  {error}
                </div>
              )}

              <fieldset className="space-y-4 rounded-2xl border border-[var(--border)] bg-gradient-to-b from-white to-[#faf9f6] p-6 shadow-inner shadow-black/[0.02]">
                <legend className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                  {t("auth.orgSection")}
                </legend>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">
                    {t("auth.orgName")}
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">Type</label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value as Organization["type"])}
                      className={selectClass}
                    >
                      {ORG_TYPES.map((ty) => (
                        <option key={ty} value={ty}>
                          {ty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">
                      {t("organizations.country")}
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={selectClass}
                      required
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">Region</label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={inputClass}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">Diocese</label>
                    <input
                      type="text"
                      value={diocese}
                      onChange={(e) => setDiocese(e.target.value)}
                      className={inputClass}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-2xl border border-[var(--border)] bg-gradient-to-b from-white to-[#faf9f6] p-6 shadow-inner shadow-black/[0.02]">
                <legend className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                  {t("auth.adminSection")}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">
                      {t("auth.fullName")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">
                      {t("auth.email")}
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">
                      {t("auth.password")}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      minLength={8}
                      required
                    />
                    <p className="mt-1.5 text-[11px] text-gray-500">{t("auth.passwordHint")}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">
                      {t("auth.passwordConfirm")}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputClass}
                      minLength={8}
                      required
                    />
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--navy)] shadow-lg shadow-[var(--accent)]/25 ring-1 ring-black/[0.04] transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/30 disabled:pointer-events-none disabled:opacity-55"
              >
                <UserPlus className="h-4 w-4" strokeWidth={2} />
                {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
              </button>

              <p className="text-center text-sm text-gray-600">
                {t("auth.haveAccount")}{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
                >
                  {t("auth.signIn")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <aside className="col-span-1 row-start-2 flex min-h-0 flex-col lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-dvh lg:max-w-none">
        <PlatformAdvantagesPanel variant="signup" />
      </aside>
    </div>
  );
}
