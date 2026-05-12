"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Shield, Eye, Edit, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import type { PublicUser, UserRole } from "@/lib/types";
import { isOrganizationAdministrator, MEMBER_INVITABLE_ROLES } from "@/lib/org-permissions";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-[var(--accent-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/12";

const selectClass =
  "w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm shadow-sm focus:border-[var(--accent-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/12";

const roleCards: {
  name: UserRole;
  description: string;
  access: string[];
  icon: typeof Shield;
}[] = [
  {
    name: "Executive Director",
    description: "Organization administrator",
    access: ["Full module access", "Executive reports", "Creates member accounts & roles"],
    icon: Shield,
  },
  {
    name: "Program Manager",
    description: "Program-level view",
    access: ["Program dashboards", "Project list", "Indicators"],
    icon: Eye,
  },
  {
    name: "Project Manager",
    description: "Project editing",
    access: ["Project details", "Budget lines", "M&E data", "Documents"],
    icon: Edit,
  },
  {
    name: "Finance Officer",
    description: "Financial module",
    access: ["Financial oversight", "Budget vs actual", "Donor reporting"],
    icon: Edit,
  },
  {
    name: "M&E Officer",
    description: "Indicators & reporting",
    access: ["Indicators", "Target vs actual", "Disaggregation"],
    icon: Edit,
  },
  {
    name: "Partner/Diocese",
    description: "Limited access",
    access: ["Assigned projects only", "Read-only reports"],
    icon: Eye,
  },
];

export default function UsersPage() {
  const { t } = useLocale();
  const { user, tenant } = useAuth();
  const isAdmin = user ? isOrganizationAdministrator(user.role) : false;

  const [members, setMembers] = useState<PublicUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(MEMBER_INVITABLE_ROLES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || t("users.loadMembersError"));
      }
      const data = (await res.json()) as { users: PublicUser[] };
      setMembers(data.users);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("users.loadMembersError"));
      setMembers([]);
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (password.length < 8) {
      setFormError(t("auth.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setSuccess(t("users.inviteSuccess"));
      setName("");
      setEmail("");
      setPassword("");
      setRole(MEMBER_INVITABLE_ROLES[0]);
      await loadMembers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const sortedMembers = members
    ? [...members].sort((a, b) => {
        if (a.email === user?.email) return -1;
        if (b.email === user?.email) return 1;
        return a.name.localeCompare(b.name);
      })
    : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl text-[var(--navy)]">{t("users.title")}</h1>
        <p className="mt-1 text-gray-600">{t("users.subtitle")}</p>
      </header>

      <div className="space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
        <div className="rounded-lg border border-[var(--border)] bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">
            <strong>{user?.name ?? "—"}</strong>
            {user?.role ? ` · ${user.role}` : ""}
            {tenant ? ` · ${tenant.name} (${tenant.country})` : ""}
          </p>
          <p className="mt-1 text-xs text-amber-700/80">{user?.email}</p>
        </div>

        {isAdmin ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
                {t("users.memberListTitle")}
              </h2>
              {loadError && (
                <p className="text-sm text-rose-600" role="alert">
                  {loadError}
                </p>
              )}
              {sortedMembers && sortedMembers.length <= 1 && (
                <p className="text-sm text-gray-500">{t("users.memberListEmpty")}</p>
              )}
              {sortedMembers && sortedMembers.length >= 1 && (
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">{t("auth.fullName")}</th>
                        <th className="px-4 py-3">{t("auth.email")}</th>
                        <th className="px-4 py-3">{t("users.roleLabel")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMembers.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-[var(--border)]/70 last:border-0 odd:bg-white/50"
                        >
                          <td className="px-4 py-3 font-medium text-[var(--navy)]">
                            {m.name}
                            {m.id === user?.id ? (
                              <span className="ml-2 text-xs font-normal text-gray-400">{t("users.youBadge")}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{m.email}</td>
                          <td className="px-4 py-3 text-gray-700">{m.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--accent)]/10 p-2">
                  <UserPlus className="h-5 w-5 text-[var(--accent-dark)]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
                    {t("users.inviteTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{t("users.inviteHint")}</p>
                </div>
              </div>

              <form onSubmit={handleInvite} className="mt-6 space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}
                {success && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {success}
                  </p>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t("auth.fullName")}</label>
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t("auth.email")}</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t("auth.password")}</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t("auth.passwordHint")}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t("users.roleLabel")}</label>
                  <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                    {MEMBER_INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--navy)] shadow-md ring-1 ring-black/[0.04] hover:brightness-[0.98] disabled:opacity-55"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? t("users.inviting") : t("users.inviteSubmit")}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-950">
            {t("users.adminOnlyNotice")}
          </div>
        )}

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-[var(--navy)]">
            {t("users.rolesReferenceTitle")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roleCards.map((roleItem) => (
              <div
                key={roleItem.name}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                    <roleItem.icon className="h-6 w-6 text-[var(--accent-dark)]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{roleItem.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{roleItem.description}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-4">
                  {roleItem.access.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
