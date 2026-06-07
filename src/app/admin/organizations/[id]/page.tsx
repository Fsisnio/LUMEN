"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  FolderOpen,
  Heart,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Ticket,
  RefreshCw,
  Calendar,
  MapPin,
  Briefcase,
  Target,
  Banknote,
  Mail,
  Sparkles,
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
} from "recharts";
import { KPICard } from "@/components/KPICard";
import { useAuth } from "@/contexts/AuthContext";
import type {
  BudgetLine,
  Indicator,
  Organization,
  Program,
  Project,
  RiskItem,
} from "@/lib/types";

type OrgDetail = {
  organization: Organization;
  metrics: {
    totalBudget: number;
    totalSpent: number;
    utilizationPct: number;
    totalBeneficiaries: number;
    byStatus: Record<"active" | "completed" | "delayed" | "planning", number>;
    byRisk: Record<"low" | "medium" | "high" | "critical", number>;
    indicatorAttainment: { target: number; actual: number; pct: number };
  };
  programs: Program[];
  projects: Project[];
  indicators: Indicator[];
  budgetLines: BudgetLine[];
  risks: RiskItem[];
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    isSuperadmin: boolean;
  }[];
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

function effectiveTier(o: Organization, now: number): string {
  if (!o.subscription) return "free";
  return Date.parse(o.subscription.paidUntil) > now ? o.subscription.tier : "free";
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const isSuperadmin = user?.isSuperadmin === true;

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Accès superadmin requis.");
        if (res.status === 404) throw new Error("Organisation introuvable.");
        throw new Error(`Échec du chargement (HTTP ${res.status}).`);
      }
      setDetail((await res.json()) as OrgDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && isSuperadmin) refresh();
  }, [authLoading, isSuperadmin, refresh]);

  const grant = useCallback(
    async (tier: "day_pass" | "week_pass" | "month_pass") => {
      if (!id) return;
      setGranting(true);
      setToast(null);
      try {
        const res = await fetch("/api/admin/grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: id, tier }),
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
        setGranting(false);
      }
    },
    [id, refresh]
  );

  const now = Date.now();

  const projectByProgram = useMemo(() => {
    if (!detail) return new Map<string, Project[]>();
    const m = new Map<string, Project[]>();
    for (const p of detail.projects) {
      const list = m.get(p.programId) ?? [];
      list.push(p);
      m.set(p.programId, list);
    }
    return m;
  }, [detail]);

  const statusPieData = useMemo(() => {
    if (!detail) return [];
    return (Object.keys(detail.metrics.byStatus) as Array<keyof typeof detail.metrics.byStatus>)
      .map((k) => ({ name: STATUS_LABEL[k], value: detail.metrics.byStatus[k], color: STATUS_COLOR[k] }))
      .filter((x) => x.value > 0);
  }, [detail]);

  const riskBarData = useMemo(() => {
    if (!detail) return [];
    return (["low", "medium", "high", "critical"] as const).map((k) => ({
      name: RISK_LABEL[k],
      value: detail.metrics.byRisk[k] ?? 0,
      color: RISK_COLOR[k],
    }));
  }, [detail]);

  const programBarData = useMemo(() => {
    if (!detail) return [];
    return detail.programs.map((p) => ({
      name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
      budgetK: Math.round((p.totalBudget ?? 0) / 1000),
      spentK: Math.round((p.spentBudget ?? 0) / 1000),
    }));
  }, [detail]);

  if (authLoading || (loading && !detail && !error)) {
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
          <h2 className="mt-4 font-display text-xl font-semibold text-rose-900">Accès restreint</h2>
          <p className="mt-2 text-sm text-rose-800">Cette console est réservée au superadmin Lumen.</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--navy)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error ?? "Organisation introuvable."}
        </div>
      </div>
    );
  }

  const org = detail.organization;
  const tier = effectiveTier(org, now);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-br from-[#1c2235] via-[#2d3548] to-[#3a4a6b] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <Link
          href="/admin"
          className="relative mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Console superadmin
        </Link>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-white/20">
              <Building2 className="h-3.5 w-3.5" /> Détail organisation
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{org.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {org.country}
              </span>
              <span className="text-white/40">·</span>
              <span>{org.type}</span>
              {org.diocese && (
                <>
                  <span className="text-white/40">·</span>
                  <span>{org.diocese}</span>
                </>
              )}
              {org.region && (
                <>
                  <span className="text-white/40">·</span>
                  <span>{org.region}</span>
                </>
              )}
              <span
                className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TIER_BADGE[tier]} text-[#2d3548]`}
              >
                {TIER_LABEL[tier]}
              </span>
              {org.subscription && (
                <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                  <Calendar className="h-3 w-3" />
                  jusqu'au {formatDate(org.subscription.paidUntil)}
                </span>
              )}
            </div>
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

        {/* Abonnement / Grant */}
        <div className="mb-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Forfait actuel</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">{TIER_LABEL[tier]}</p>
            <p className="mt-1 text-xs text-gray-500">
              {org.subscription ? `Échéance : ${formatDate(org.subscription.paidUntil)}` : "Aucun abonnement payant"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Remise renouvellement</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">
              {org.nextRenewalDiscountPct ? `${org.nextRenewalDiscountPct}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-gray-500">Applicable au prochain checkout</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Octroyer un forfait</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["day_pass", "week_pass", "month_pass"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={granting}
                  onClick={() => grant(t)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--navy)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Ajoute la durée du tier (cumulé si déjà actif).</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Membres" value={detail.members.length} icon={Users} subtitle="Comptes de l'org" />
          <KPICard title="Programmes" value={detail.programs.length} icon={FolderKanban} subtitle="Thématiques" />
          <KPICard title="Projets" value={detail.projects.length} icon={FolderOpen} subtitle="Tous statuts" />
          <KPICard title="Indicateurs" value={detail.indicators.length} icon={Target} subtitle="Suivis M&E" />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Budget total" value={formatUsd(detail.metrics.totalBudget, true)} icon={Banknote} subtitle="Cumul projets" />
          <KPICard
            title="Dépensé"
            value={formatUsd(detail.metrics.totalSpent, true)}
            icon={TrendingUp}
            subtitle={`${detail.metrics.utilizationPct}% d'utilisation`}
            trend={
              detail.metrics.utilizationPct >= 70
                ? "up"
                : detail.metrics.utilizationPct < 50
                ? "down"
                : "neutral"
            }
            trendValue={
              detail.metrics.utilizationPct >= 70
                ? "Bonne consommation"
                : detail.metrics.utilizationPct < 50
                ? "Sous-utilisé"
                : "Modéré"
            }
          />
          <KPICard title="Bénéficiaires" value={formatInt(detail.metrics.totalBeneficiaries)} icon={Heart} subtitle="Personnes touchées" />
          <KPICard
            title="Atteinte indicateurs"
            value={`${detail.metrics.indicatorAttainment.pct}%`}
            icon={Sparkles}
            subtitle={`${formatInt(detail.metrics.indicatorAttainment.actual)} / ${formatInt(detail.metrics.indicatorAttainment.target)}`}
          />
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <ChartCard title="Projets par statut" icon={Briefcase}>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" label={(d) => `${d.value}`}>
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

          <ChartCard title="Risques projets" icon={AlertTriangle}>
            {riskBarData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
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

          <ChartCard title="Programmes — budget vs dépenses" icon={FolderKanban}>
            {programBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={programBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
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

        {/* Programs */}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Programmes</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Programme</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-right">Dépensé</th>
                    <th className="px-4 py-3 text-right">Projets actifs</th>
                    <th className="px-4 py-3">Risque</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.programs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucun programme.
                      </td>
                    </tr>
                  )}
                  {detail.programs.map((p) => {
                    const utilPct = p.totalBudget > 0 ? Math.round((p.spentBudget / p.totalBudget) * 100) : 0;
                    return (
                      <tr key={p.id} className="border-b border-[var(--border)]/60 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--navy)]">{p.name}</div>
                          {p.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{p.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatUsd(p.totalBudget, true)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatUsd(p.spentBudget, true)}
                          <span className="ml-1 text-[10px] text-gray-500">({utilPct}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {projectByProgram.get(p.id)?.length ?? p.activeProjects}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1"
                            style={{
                              color: RISK_COLOR[p.riskLevel],
                              borderColor: RISK_COLOR[p.riskLevel],
                              background: `${RISK_COLOR[p.riskLevel]}1a`,
                            }}
                          >
                            {RISK_LABEL[p.riskLevel]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Projets ({detail.projects.length})</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Titre</th>
                    <th className="px-4 py-3">Période</th>
                    <th className="px-4 py-3">Lieu</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-right">Dépensé</th>
                    <th className="px-4 py-3 text-right">Bénéf.</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.projects.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucun projet.
                      </td>
                    </tr>
                  )}
                  {detail.projects.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)]/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{p.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--navy)]">{p.title}</div>
                        <div className="text-[11px] text-gray-500">{p.donor} · {p.manager}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600">
                        {formatDate(p.duration.start)} → {formatDate(p.duration.end)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600">
                        {p.location}
                        {p.region && <span className="text-gray-400"> · {p.region}</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatUsd(p.budget, true)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatUsd(p.spent, true)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatInt(p.beneficiaries)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1"
                          style={{
                            color: STATUS_COLOR[p.status],
                            borderColor: STATUS_COLOR[p.status],
                            background: `${STATUS_COLOR[p.status]}1a`,
                          }}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-[var(--accent)]"
                              style={{ width: `${Math.min(p.progress ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[11px] text-gray-600">{p.progress ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Indicators */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Indicateurs</h2>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              {detail.indicators.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun indicateur défini.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.indicators.slice(0, 10).map((i) => {
                    const pct = i.target > 0 ? Math.min(Math.round((i.actual / i.target) * 100), 100) : 0;
                    return (
                      <li key={i.id}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-[var(--navy)]">{i.name}</span>
                          <span className="shrink-0 text-xs text-gray-500">
                            {formatInt(i.actual)} / {formatInt(i.target)} {i.unit}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                  {detail.indicators.length > 10 && (
                    <li className="pt-2 text-center text-xs text-gray-500">
                      + {detail.indicators.length - 10} de plus
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Risques</h2>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              {detail.risks.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun risque enregistré.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.risks.slice(0, 10).map((r) => (
                    <li key={r.id} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--navy)]">{r.description}</p>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1"
                          style={{
                            color: RISK_COLOR[r.level],
                            borderColor: RISK_COLOR[r.level],
                            background: `${RISK_COLOR[r.level]}1a`,
                          }}
                        >
                          {RISK_LABEL[r.level]}
                        </span>
                      </div>
                      {r.mitigation && (
                        <p className="mt-1 text-[11px] text-gray-600">
                          <span className="font-medium">Mitigation : </span>
                          {r.mitigation}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">{r.status}</p>
                    </li>
                  ))}
                  {detail.risks.length > 10 && (
                    <li className="pt-1 text-center text-xs text-gray-500">+ {detail.risks.length - 10} de plus</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Budget lines */}
        {detail.budgetLines.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Lignes budgétaires</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Projet</th>
                      <th className="px-4 py-3 text-right">Budgété</th>
                      <th className="px-4 py-3 text-right">Dépensé</th>
                      <th className="px-4 py-3 text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.budgetLines.slice(0, 50).map((b) => {
                      const project = detail.projects.find((p) => p.id === b.projectId);
                      const solde = b.budgeted - b.spent;
                      return (
                        <tr key={b.id} className="border-b border-[var(--border)]/60 last:border-0">
                          <td className="px-4 py-3 font-medium text-[var(--navy)]">{b.category}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-600">{project?.code ?? b.projectId}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatUsd(b.budgeted, true)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatUsd(b.spent, true)}</td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-medium ${
                              solde < 0 ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {formatUsd(solde, true)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Members */}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-[var(--navy)]">Membres ({detail.members.length})</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Créé</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucun membre.
                      </td>
                    </tr>
                  )}
                  {detail.members.map((u) => (
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
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${u.email}`}
                          className="inline-flex items-center gap-1 text-gray-700 hover:text-[var(--accent-dark)]"
                        >
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.role}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-[var(--navy)]">{title}</h3>
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
    <div className="flex h-[220px] items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400">
      Pas encore de données
    </div>
  );
}
