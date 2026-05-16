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
  Globe2,
  Target,
  TrendingUp,
  Heart,
  Activity,
  Clock,
  Crown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { KPICard } from "@/components/KPICard";
import { useAuth } from "@/contexts/AuthContext";

type Overview = {
  counts: {
    organizations: number;
    users: number;
    programs: number;
    projects: number;
    indicators: number;
    risks: number;
    activeSubscriptions: number;
  };
  financial: { totalBudget: number; totalSpent: number; utilizationPct: number; totalBeneficiaries: number };
  estimatedMrrUsd: number;
  byTier: Record<string, number>;
  byStatus: Record<"active" | "completed" | "delayed" | "planning", number>;
  byRisk: Record<"low" | "medium" | "high" | "critical", number>;
  risks: { open: number; highOrCritical: number };
  byCountry: { country: string; orgs: number; projects: number; users: number; budget: number }[];
  programsByTheme: { theme: string; count: number; budget: number; spent: number; projects: number }[];
  topOrgsByBudget: { id: string; name: string; country: string; budget: number; spent: number; projects: number; tier: string }[];
  topOrgsByBeneficiaries: { id: string; name: string; country: string; beneficiaries: number; projects: number; tier: string }[];
  passesExpiringSoon: { orgId: string; name: string; country: string; tier: string; paidUntil: string; daysLeft: number }[];
  indicators: {
    totalTarget: number;
    totalActual: number;
    attainmentPct: number;
    topUnits: { unit: string; actual: number; target: number }[];
  };
  recentSignups: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationName: string;
    country: string;
    createdAt: string;
    isSuperadmin: boolean;
  }[];
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

const TIER_COLOR: Record<string, string> = {
  free: "#94a3b8",
  day_pass: "#0ea5e9",
  week_pass: "#8b5cf6",
  month_pass: "#c9a227",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#10b981",
  completed: "#2d3548",
  delayed: "#f59e0b",
  planning: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  active: "En cours",
  completed: "Terminés",
  delayed: "En retard",
  planning: "Planifiés",
};

const RISK_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7f1d1d",
};

const RISK_LABEL: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  critical: "Critique",
};

const COUNTRY_PALETTE = [
  "#c9a227",
  "#2d3548",
  "#5c6b7a",
  "#8b9a6b",
  "#a67c52",
  "#6b8e9a",
  "#9a7b5c",
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatUsd(n: number, compact = false): string {
  if (compact && n >= 1000) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${(n / 1000).toFixed(0)}k`;
  }
  return `$${n.toLocaleString("fr-FR")}`;
}

function formatInt(n: number): string {
  return n.toLocaleString("fr-FR");
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

  const tierPieData = useMemo(() => {
    if (!overview) return [];
    return (["free", "day_pass", "week_pass", "month_pass"] as const)
      .map((tier) => ({ name: TIER_LABEL[tier], value: overview.byTier[tier] ?? 0, color: TIER_COLOR[tier] }))
      .filter((x) => x.value > 0);
  }, [overview]);

  const statusPieData = useMemo(() => {
    if (!overview) return [];
    return (Object.keys(overview.byStatus) as Array<keyof typeof overview.byStatus>)
      .map((k) => ({ name: STATUS_LABEL[k], value: overview.byStatus[k], color: STATUS_COLOR[k] }))
      .filter((x) => x.value > 0);
  }, [overview]);

  const riskBarData = useMemo(() => {
    if (!overview) return [];
    return (["low", "medium", "high", "critical"] as const).map((k) => ({
      name: RISK_LABEL[k],
      value: overview.byRisk[k] ?? 0,
      color: RISK_COLOR[k],
    }));
  }, [overview]);

  const countryBarData = useMemo(() => {
    if (!overview) return [];
    return overview.byCountry.slice(0, 10).map((c, i) => ({
      name: c.country.length > 12 ? c.country.slice(0, 10) + "…" : c.country,
      projects: c.projects,
      orgs: c.orgs,
      budgetK: Math.round(c.budget / 1000),
      color: COUNTRY_PALETTE[i % COUNTRY_PALETTE.length],
    }));
  }, [overview]);

  const themeBarData = useMemo(() => {
    if (!overview) return [];
    return overview.programsByTheme.slice(0, 8).map((p) => ({
      name: p.theme.length > 14 ? p.theme.slice(0, 12) + "…" : p.theme,
      budgetK: Math.round(p.budget / 1000),
      spentK: Math.round(p.spent / 1000),
    }));
  }, [overview]);

  const indicatorRadialData = useMemo(() => {
    if (!overview) return [];
    return [
      {
        name: "Atteinte",
        value: Math.min(overview.indicators.attainmentPct, 100),
        fill: "#c9a227",
      },
    ];
  }, [overview]);

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
              Vue 360° de la plateforme
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Toutes les organisations, tous les programmes, tous les indicateurs et
              risques agrégés en temps réel. Pilotage, abonnements et octroi manuel de
              forfaits depuis un seul endroit.
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

        {/* Layer 1 — primary KPIs */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <KPICard title="Organisations" value={overview?.counts.organizations ?? "—"} icon={Building2} subtitle="Tous tenants" />
          <KPICard title="Utilisateurs" value={overview?.counts.users ?? "—"} icon={Users} subtitle="Comptes plateforme" />
          <KPICard title="Programmes" value={overview?.counts.programs ?? "—"} icon={FolderKanban} subtitle="Thématiques" />
          <KPICard title="Projets" value={overview?.counts.projects ?? "—"} icon={FolderOpen} subtitle="Portefeuille global" />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Budget total"
            value={overview ? formatUsd(overview.financial.totalBudget, true) : "—"}
            icon={DollarSign}
            subtitle={overview ? `Dépensé : ${formatUsd(overview.financial.totalSpent, true)}` : undefined}
          />
          <KPICard
            title="Taux d'exécution"
            value={overview ? `${overview.financial.utilizationPct}%` : "—"}
            icon={TrendingUp}
            trend={
              overview
                ? overview.financial.utilizationPct >= 70
                  ? "up"
                  : overview.financial.utilizationPct < 50
                  ? "down"
                  : "neutral"
                : undefined
            }
            trendValue={
              overview
                ? overview.financial.utilizationPct >= 70
                  ? "Bonne consommation"
                  : overview.financial.utilizationPct < 50
                  ? "Sous-utilisé"
                  : "Modéré"
                : undefined
            }
          />
          <KPICard
            title="Bénéficiaires"
            value={overview ? formatInt(overview.financial.totalBeneficiaries) : "—"}
            icon={Heart}
            subtitle="Personnes touchées"
          />
          <KPICard
            title="MRR estimé"
            value={overview ? formatUsd(overview.estimatedMrrUsd) : "—"}
            icon={BadgeCheck}
            subtitle={overview ? `${overview.counts.activeSubscriptions} pass actifs` : undefined}
          />
        </div>

        {/* Layer 2 — charts row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <ChartCard title="Forfaits actifs" icon={Crown} subtitle="Répartition par tier">
            {tierPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={tierPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" label={(d) => `${d.value}`}>
                    {tierPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} org(s)`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard title="Projets par statut" icon={Activity} subtitle="État du portefeuille">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" label={(d) => `${d.value}`}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} projet(s)`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard title="Risques projets" icon={AlertTriangle} subtitle="Niveau de risque agrégé">
            {riskBarData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={riskBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} projet(s)`, ""]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {riskBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <ChartCard title="Pays — projets et budget" icon={Globe2} subtitle="Top 10 par dotation">
            {countryBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={countryBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}k`} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "budgetK") return [`$${value}k`, "Budget"];
                      if (name === "projects") return [`${value}`, "Projets"];
                      return [String(value), name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="projects" fill="#2d3548" name="Projets" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="budgetK" fill="#c9a227" name="Budget" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard title="Programmes — budget vs dépenses" icon={FolderKanban} subtitle="Top 8 thématiques">
            {themeBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={themeBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}k`} />
                  <Tooltip formatter={(value) => [`$${value}k`, ""]} />
                  <Legend />
                  <Bar dataKey="budgetK" fill="#2d3548" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spentK" fill="#c9a227" name="Dépensé" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <ChartCard title="Atteinte indicateurs" icon={Target} subtitle="Cible vs réalisé (agrégé)">
            <div className="relative h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="65%" outerRadius="100%" data={indicatorRadialData} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-semibold text-[var(--navy)]">
                  {overview?.indicators.attainmentPct ?? 0}%
                </span>
                <span className="text-xs text-gray-500">d'atteinte globale</span>
              </div>
            </div>
            {overview && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Cible totale</p>
                  <p className="font-semibold text-[var(--navy)]">{formatInt(overview.indicators.totalTarget)}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Réalisé</p>
                  <p className="font-semibold text-[var(--navy)]">{formatInt(overview.indicators.totalActual)}</p>
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Top organisations (budget)" icon={Crown} subtitle="6 premières">
            <ul className="space-y-2">
              {(overview?.topOrgsByBudget ?? []).map((o, i) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--navy)]">
                      <span className="text-gray-400">#{i + 1}</span> {o.name}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {o.country} · {o.projects} projet{o.projects > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--navy)]">{formatUsd(o.budget, true)}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0 text-[10px] ring-1 ${TIER_BADGE[o.tier]}`}>
                      {TIER_LABEL[o.tier]}
                    </span>
                  </div>
                </li>
              ))}
              {(!overview || overview.topOrgsByBudget.length === 0) && <li className="text-sm text-gray-400">—</li>}
            </ul>
          </ChartCard>

          <ChartCard title="Échéances proches" icon={Clock} subtitle="Pass expirant ≤ 14 jours">
            <ul className="space-y-2">
              {(overview?.passesExpiringSoon ?? []).map((o) => (
                <li key={o.orgId} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--navy)]">{o.name}</p>
                    <p className="truncate text-[11px] text-gray-500">{o.country}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] ring-1 ${TIER_BADGE[o.tier]}`}>
                      {TIER_LABEL[o.tier]}
                    </span>
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        o.daysLeft <= 3 ? "text-rose-600" : o.daysLeft <= 7 ? "text-amber-600" : "text-gray-600"
                      }`}
                    >
                      {o.daysLeft === 0 ? "Aujourd'hui" : `${o.daysLeft} jour${o.daysLeft > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </li>
              ))}
              {(!overview || overview.passesExpiringSoon.length === 0) && (
                <li className="text-sm text-gray-400">Aucune échéance imminente.</li>
              )}
            </ul>
          </ChartCard>
        </div>

        {/* Search + tables */}
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
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TIER_BADGE[tier]}`}>
                          {TIER_LABEL[tier]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(o.subscription?.paidUntil)}</td>
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

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-display text-xl font-semibold text-[var(--navy)]">Top bénéficiaires touchés</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3 text-right">Bénéficiaires</th>
                    <th className="px-4 py-3 text-right">Projets</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.topOrgsByBeneficiaries ?? []).map((o) => (
                    <tr key={o.id} className="border-b border-[var(--border)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--navy)]">{o.name}</div>
                        <div className="text-[11px] text-gray-500">{o.country}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatInt(o.beneficiaries)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.projects}</td>
                    </tr>
                  ))}
                  {(!overview || overview.topOrgsByBeneficiaries.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-display text-xl font-semibold text-[var(--navy)]">Inscriptions récentes</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Créé</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentSignups ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--navy)]">{u.name}</div>
                        <div className="text-[11px] text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.organizationName}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                  {(!overview || overview.recentSignups.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--navy)]">
            Tous les utilisateurs ({filteredUsers.length})
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

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-[var(--navy)]">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-[var(--accent)]/10 p-2">
          <Icon className="h-4 w-4 text-[var(--accent-dark)]" />
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400">
      Pas encore de données
    </div>
  );
}
