"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FolderOpen,
  DollarSign,
  MapPin,
  Shield,
  Users,
  Sparkles,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { UserMenu } from "@/components/UserMenu";

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/organizations", labelKey: "nav.organizations", icon: Building2 },
  { href: "/programs", labelKey: "nav.programs", icon: FolderKanban },
  { href: "/projects", labelKey: "nav.projects", icon: FolderOpen },
  { href: "/financial", labelKey: "nav.financial", icon: DollarSign },
  { href: "/geographic", labelKey: "nav.geographic", icon: MapPin },
  { href: "/risk", labelKey: "nav.risk", icon: Shield },
  { href: "/analysis", labelKey: "nav.analysis", icon: Sparkles },
  { href: "/users", labelKey: "nav.users", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--navy)]">
          <span className="font-display text-xl font-bold">L</span>
        </div>
        <div>
          <span className="font-display text-xl font-semibold text-[var(--navy)]">Lumen</span>
          <p className="text-[10px] text-gray-500">CARIPRIP</p>
        </div>
      </div>
      <div className="border-b border-[var(--border)] p-3">
        <UserMenu />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent-dark)]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[var(--navy)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              <span className="flex-1">{t(labelKey)}</span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-4 space-y-2">
        <SettingsDropdown />
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="truncate text-xs font-medium text-gray-700">
            {user?.name ?? t("user.role")}
          </p>
          <p className="truncate text-[10px] text-gray-500">
            {user?.role ?? t("user.access")}
          </p>
        </div>
      </div>
    </aside>
  );
}
