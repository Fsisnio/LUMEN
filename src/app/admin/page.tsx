"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  FolderKanban,
  FolderOpen,
  BadgeCheck,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Search,
  RefreshCw,
  Ticket,
  AlertTriangle,
} from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useAuth } from "@/contexts/AuthContext";

type Overview = {
  counts: {
    organizations: number;
    users: number;
    programs: number;
    projects: number;
    activeSubscriptions: number;
  };
  estimatedMrrUsd: number;
  byTier: Record<string, number>;
};

type AdminOrg = {
  id: string;
  name: string;
  country: string;
  type: string;
  diocese?: string;
  subscription?: { tier: string; paidUntil: string };
  nextRenewalDiscountPct?: number;
  userCount: number;
  programCount: number;
  projectCount: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  isSuperadmin: boolean;
};

const TIER_LABEL: Record<string, string> = {
  free: "Gratuit",
  day_pass: "Pass jour",
  week_pass: "Pass semaine",
  month_pass: "Pass mois",
};

const TIER_BADGE: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 ring-gray-200",
  day_pass: "bg-sky-50 text-sky-700 ring-sky-200",
  week_pass: "bg-violet-50 text-violet-700 ring-violet-200",
  month_pass: "bg-amber-50 text-amber-800 ring-amber-200",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function effectiveTier(o: AdminOrg, now: number): string {
  if (!o.subscription) return "free";
  return Date.parse(o.subscription.paidUntil) > now ? o.subscription.tier : "free";
}

export default function SuperadminPage() {
  const { user, loading: authLoading } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [granting, setGranting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const isSuperadmin = user?.isSuperadmin === true;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, og, us] = await Promise.all([
        fetch("/api/admin/overview", { cache: "no-store" }),
        fetch("/api/admin/organizations", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);
      if (!ov.ok || !og.ok || !us.ok) {
        if (ov.status === 401 || og.status === 401 || us.status === 401) {
          throw new Error("Vous devez être connecté.");
        }
        if (ov.status === 403 || og.status === 403 || us.status === 403) {
          throw new Error("Accès superadmin requis.");
        }
        throw new Error("Impossible de charger le tableau de bord.");
      }
      const [ovJson, ogJson, usJson] = await Promise.all([ov.json(), og.json(), us.json()]);
      setOverview(ovJson as Overview);
      setOrgs((ogJson as { organizations: AdminOrg[] }).organizations);
      setUsers((usJson as { users: AdminUser[] }).users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isSuperadmin) refresh();
  }, [authLoading, isSuperadmin, refresh]);

  const grant = useCallback(
    async (orgId: string, tier: "day_pass" | "week_pass" | "month_pass") => {
      setGranting(orgId);
      setToast(null);
      try {
        const res = await fetch("/api/admin/grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, tier }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Échec (HTTP ${res.status})`);
        }
        setToast({ kind: "ok", msg: `Forfait ${TIER_LABEL[tier]} appliqué.` });
        await refresh();
      } catch (e) {
        setToast({ kind: "err", msg: e instanceof Error ? e.message : "Erreur" });
      } finally {
        setGranting(null);
      }
    },
    [refresh]
  );

  const now = Date.now();
  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q) ||
        (o.diocese ?? "").toLowerCase().includes(q)
    );
  }, [orgs, query]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.organizationName.toLowerCase().includes(q)
      )
      .slice(0, 200);
  }, [users, query]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-4 font-display text-xl font-semibold text-rose-900">
            Accès restreint
          </h2>
          <p className="mt-2 text-sm text-rose-800">
            Cette console est réservée au superadmin Lumen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-br from-[#1c2235] via-[#2d3548] to-[#3a4a6b] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" /> Console superadmin
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Tableau de bord plateforme
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Pilotez toutes les organisations Lumen, surveillez les abonnements
              et accordez manuellement des forfaits en un clic.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>
      </section>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {toast && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              toast.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard
            title="Organisations"
            value={overview?.counts.organizations ?? "—"}
            icon={Building2}
            subtitle="Tous tenants"
          />
          <KPICard
            title="Utilisateurs"
            value={overview?.counts.users ?? "—"}
            icon={Users}
            subtitle="Comptes actifs"
          />
          <KPICard
            title="Programmes"
            value={overview?.counts.programs ?? "—"}
            icon={FolderKanban}
            subtitle="Toutes orgs"
          />
          <KPICard
            title="Projets"
            value={overview?.counts.projects ?? "—"}
            icon={FolderOpen}
            subtitle="Portefeuille global"
          />
          <KPICard
            title="Abonnements actifs"
            value={overview?.counts.activeSubscriptions ?? "—"}
            icon={BadgeCheck}
            subtitle="Pass en cours"
          />
          <KPICard
            title="MRR estimé"
            value={
              overview
                ? `$${overview.estimatedMrrUsd.toLocaleString("fr-FR")}`
                : "—"
            }
            icon={DollarSign}
            subtitle="USD / cycle pass"
          />
        </div>

        {overview && (
          <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h3 className="font-display text-base font-semibold text-[var(--navy)]">
              Répartition par forfait
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["free", "day_pass", "week_pass", "month_pass"] as const).map((tier) => {
                const count = overview.byTier[tier] ?? 0;
                const total = Object.values(overview.byTier).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={tier} className="rounded-lg border border-[var(--border)] p-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TIER_BADGE[tier]}`}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                      <span className="font-display text-lg font-semibold text-[var(--navy)]">
                        {count}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">{pct}% du parc</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold text-[var(--navy)]">Organisations</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher org, pays, email…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Pays</th>
                  <th className="px-4 py-3 text-right">Membres</th>
                  <th className="px-4 py-3 text-right">Programs</th>
                  <th className="px-4 py-3 text-right">Projets</th>
                  <th className="px-4 py-3">Forfait</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      {loading ? "Chargement…" : "Aucune organisation."}
                    </td>
                  </tr>
                )}
                {filteredOrgs.map((o) => {
                  const tier = effectiveTier(o, now);
                  return (
                    <tr key={o.id} className="border-b border-[var(--border)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--navy)]">{o.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {o.type}
                          {o.diocese ? ` · ${o.diocese}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{o.country}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.userCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.programCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.projectCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TIER_BADGE[tier]}`}
                        >
                          {TIER_LABEL[tier]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(o.subscription?.paidUntil)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {(["day_pass", "week_pass", "month_pass"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              disabled={granting === o.id}
                              onClick={() => grant(o.id, t)}
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--navy)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
                              title={`Octroyer un ${TIER_LABEL[t]}`}
                            >
                              <Ticket className="h-3 w-3" />
                              {t === "day_pass" ? "J" : t === "week_pass" ? "S" : "M"}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--navy)]">
            Utilisateurs récents
          </h2>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Créé</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        {loading ? "Chargement…" : "Aucun utilisateur."}
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-[var(--navy)]">
                          {u.name}
                          {u.isSuperadmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                              <ShieldCheck className="h-3 w-3" /> SUPERADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.email}</td>
                      <td className="px-4 py-3 text-gray-700">{u.organizationName}</td>
                      <td className="px-4 py-3 text-gray-700">{u.role}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
