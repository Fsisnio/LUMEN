"use client";

import { useCallback, useMemo, useState } from "react";
import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { TenantGate } from "@/components/TenantGate";
import { Filter, FolderKanban, MapPin, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ProjectWorldMap } from "@/components/ProjectWorldMap";
import { useAuth } from "@/contexts/AuthContext";
import type { Project, RiskLevel } from "@/lib/types";

const PROJECT_STATUSES: Project["status"][] = ["active", "completed", "delayed", "planning"];
const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

type GeoFilters = {
  query: string;
  programId: string;
  regionKey: string;
  status: Project["status"] | "";
  riskLevel: RiskLevel | "";
  onlyMapped: boolean;
};

const INITIAL_FILTERS: GeoFilters = {
  query: "",
  programId: "",
  regionKey: "",
  status: "",
  riskLevel: "",
  onlyMapped: false,
};

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[var(--accent-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";
const selectClass =
  "w-full min-h-[42px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:border-[var(--accent-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

function summarize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable key for grouping regions across free-text variants (trim + lowercase). */
function regionKey(region: string | undefined) {
  const t = summarize(region ?? "");
  return t || "—";
}

function filterProjects(projects: Project[], f: GeoFilters): Project[] {
  const q = summarize(f.query);
  return projects.filter((p) => {
    if (f.programId && p.programId !== f.programId) return false;
    if (f.regionKey && regionKey(p.region) !== f.regionKey) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.riskLevel && p.riskLevel !== f.riskLevel) return false;
    if (f.onlyMapped && (p.lat == null || p.lng == null)) return false;
    if (q) {
      const hay = [p.title, p.code, p.location, p.region, p.donor, p.manager]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export default function GeographicPage() {
  return (
    <TenantGate>
      <GeographicPageInner />
    </TenantGate>
  );
}

function GeographicPageInner() {
  const { data, loading, error } = useData();
  const { t } = useLocale();
  const { tenant } = useAuth();
  const [filters, setFilters] = useState<GeoFilters>(INITIAL_FILTERS);

  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];

  const regionOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      const key = regionKey(p.region);
      const label = (p.region ?? "").trim() || "—";
      if (!m.has(key)) m.set(key, label);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
  }, [projects]);

  const filteredProjects = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  const regionStats = filteredProjects.reduce(
    (acc, p) => {
      const label = (p.region ?? "").trim() || "—";
      if (!acc[label]) {
        acc[label] = { projects: 0, beneficiaries: 0 };
      }
      acc[label].projects += 1;
      acc[label].beneficiaries += p.beneficiaries;
      return acc;
    },
    {} as Record<string, { projects: number; beneficiaries: number }>
  );

  const chartData = Object.entries(regionStats).map(([name, d]) => ({
    name,
    projects: d.projects,
    beneficiaries: Math.round(d.beneficiaries / 1000),
  }));

  const programsMini = programs.map((p) => ({ id: p.id, name: p.name }));
  const withCoordsCount = filteredProjects.filter((p) => p.lat != null && p.lng != null).length;
  const mapSectionTitle =
    `${tenant?.name ?? t("geographic.organizationScope")} — ${t("geographic.projectLocationsHeading")}`;
  const mapFooterCaption =
    `${tenant?.name ?? "—"} · ${withCoordsCount}/${filteredProjects.length} ${t("geographic.projectsWithMapCoords")}`;

  const filteredSummary = t("geographic.filteredSummary")
    .replace("{shown}", String(filteredProjects.length))
    .replace("{total}", String(projects.length));

  const resetFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-rose-600">
          {t("common.error")}: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">{t("geographic.title")}</h1>
        <p className="mt-1 text-gray-600">{t("geographic.subtitle")}</p>
      </header>

      <div className="p-8">
        <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/80 pb-4">
            <div className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-gray-600">
              <Filter className="h-4 w-4 text-[var(--accent-dark)]" aria-hidden />
              {t("geographic.filtersTitle")}
            </div>
            <p className="text-sm text-gray-600">{filteredSummary}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-[var(--accent-dark)] underline-offset-4 hover:underline"
            >
              {t("geographic.resetFilters")}
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="md:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("geographic.filterSearch")}</label>
              <input
                type="search"
                className={inputClass}
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t("geographic.filterSearchPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("geographic.filterProgram")}</label>
              <select
                className={selectClass}
                value={filters.programId}
                onChange={(e) => setFilters((prev) => ({ ...prev, programId: e.target.value }))}
              >
                <option value="">{t("geographic.filterAllOption")}</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("geographic.filterRegion")}</label>
              <select
                className={selectClass}
                value={filters.regionKey}
                onChange={(e) => setFilters((prev) => ({ ...prev, regionKey: e.target.value }))}
              >
                <option value="">{t("geographic.filterAllOption")}</option>
                {regionOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("geographic.filterStatus")}</label>
              <select
                className={selectClass}
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value as GeoFilters["status"] }))
                }
              >
                <option value="">{t("geographic.filterAllOption")}</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("geographic.filterRisk")}</label>
              <select
                className={selectClass}
                value={filters.riskLevel}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, riskLevel: e.target.value as GeoFilters["riskLevel"] }))
                }
              >
                <option value="">{t("geographic.filterAllOption")}</option>
                {RISK_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.onlyMapped}
              onChange={(e) => setFilters((prev) => ({ ...prev, onlyMapped: e.target.checked }))}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent-dark)] focus:ring-[var(--accent)]"
            />
            {t("geographic.filterOnlyMapped")}
          </label>
        </section>

        {filteredProjects.length === 0 && (
          <div className="mb-8 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("geographic.noMatches")}
          </div>
        )}

        <div className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--navy)]">{mapSectionTitle}</h2>
            <div className="flex flex-wrap justify-end gap-2">
              {Object.entries(regionStats).map(([region, d]) => (
                <span
                  key={region}
                  className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-sm font-medium text-[var(--accent-dark)]"
                >
                  {region}: {d.projects} project{d.projects !== 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </div>
          <ProjectWorldMap projects={filteredProjects} programs={programsMini} footerCaption={mapFooterCaption} />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                <MapPin className="h-6 w-6 text-[var(--accent-dark)]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Regions Covered</p>
                <p className="font-display text-2xl font-semibold">{Object.keys(regionStats).length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                <FolderKanban className="h-6 w-6 text-[var(--accent-dark)]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Locations</p>
                <p className="font-display text-2xl font-semibold">{filteredProjects.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                <Users className="h-6 w-6 text-[var(--accent-dark)]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Beneficiaries</p>
                <p className="font-display text-2xl font-semibold">
                  {filteredProjects.reduce((s, p) => s + p.beneficiaries, 0).toLocaleString("en-US")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Projects by Region</h3>
            <div className="mt-4 h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="projects" fill="#c9a227" name="Projects" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">—</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Beneficiaries by Region (thousands)</h3>
            <div className="mt-4 h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="beneficiaries" fill="#2d3548" name="Beneficiaries (K)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">—</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-display text-lg font-semibold text-[var(--navy)]">
            Projects by Location
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Project</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Region</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Beneficiaries</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const program = programs.find((pr) => pr.id === p.programId);
                  return (
                    <tr key={p.id} className="border-b border-[var(--border)]/50 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-gray-500">
                          {p.code} · {program?.name}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.location}</td>
                      <td className="px-6 py-3">
                        <span className="rounded bg-[var(--accent)]/10 px-2 py-0.5 text-sm font-medium text-[var(--accent-dark)]">
                          {p.region?.trim() || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">{p.beneficiaries.toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
