"use client";

import { Shield, Eye, Edit } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";

const roles = [
  {
    name: "Executive Director",
    description: "Full dashboard view",
    access: ["All modules", "Executive reports", "User management"],
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
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)]">{t("users.title")}</h1>
        <p className="mt-1 text-gray-600">
          {t("users.subtitle")}
        </p>
      </header>

      <div className="p-8">
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">
            <strong>{user?.name ?? "—"}</strong>
            {user?.role ? ` · ${user.role}` : ""}
            {tenant ? ` · ${tenant.name} (${tenant.country})` : ""}
          </p>
          <p className="mt-1 text-xs text-amber-700/80">{user?.email}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
                  <role.icon className="h-6 w-6 text-[var(--accent-dark)]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
                    {role.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-4">
                {role.access.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
