"use client";

import { useData } from "@/hooks/use-data";
import { useLocale } from "@/contexts/LocaleContext";
import { TenantGate } from "@/components/TenantGate";
import { MapPin, Users, FolderKanban } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SenegalMap } from "@/components/SenegalMap";

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
  const projects = data?.projects ?? [];
  const programs = data?.programs ?? [];

  const regionStats = projects.reduce(
    (acc, p) => {
      if (!acc[p.region]) {
        acc[p.region] = { projects: 0, beneficiaries: 0 };
      }
      acc[p.region].projects += 1;
      acc[p.region].beneficiaries += p.beneficiaries;
      return acc;
    },
    {} as Record<string, { projects: number; beneficiaries: number }>
  );

  const chartData = Object.entries(regionStats).map(([name, data]) => ({
    name: name,
    projects: data.projects,
    beneficiaries: Math.round(data.beneficiaries / 1000),
  }));

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
        <p className="text-rose-600">{t("common.error")}: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">
          {t("geographic.title")}
        </h1>
        <p className="mt-1 text-gray-600">
          {t("geographic.subtitle")}
        </p>
      </header>

      <div className="p-8">
        {/* Interactive Map — Senegal */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
              Caritas Sénégal — Project Locations
            </h2>
            <div className="flex flex-wrap justify-end gap-2">
              {Object.entries(regionStats).map(([region, data]) => (
                <span
                  key={region}
                  className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-sm font-medium text-[var(--accent-dark)]"
                >
                  {region}: {data.projects} project{data.projects !== 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </div>
          <SenegalMap projects={projects} />
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                <MapPin className="h-6 w-6 text-[var(--accent-dark)]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Regions Covered</p>
                <p className="font-display text-2xl font-semibold">
                  {Object.keys(regionStats).length}
                </p>
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
                <p className="font-display text-2xl font-semibold">{projects.length}</p>
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
                  {projects.reduce((s, p) => s + p.beneficiaries, 0).toLocaleString("en-US")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Projects by Region
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="projects" fill="#c9a227" name="Projects" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
              Beneficiaries by Region (thousands)
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="beneficiaries" fill="#2d3548" name="Beneficiaries (K)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Projects by location table */}
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
                {projects.map((p) => {
                  const program = programs.find((pr) => pr.id === p.programId);
                  return (
                    <tr key={p.id} className="border-b border-[var(--border)]/50 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.code} · {program?.name}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.location}</td>
                      <td className="px-6 py-3">
                        <span className="rounded bg-[var(--accent)]/10 px-2 py-0.5 text-sm font-medium text-[var(--accent-dark)]">
                          {p.region}
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
