"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Globe2, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Sidebar header: shows the active tenant (org + country) plus a popup menu
 * with the signed-in user info and a sign-out button. Replaces the legacy
 * tenant switcher (a user is now bound to a single organization).
 */
export function UserMenu() {
  const { user, tenant, signOut } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left transition hover:border-[var(--accent)]"
      >
        <Building2 className="h-4 w-4 shrink-0 text-[var(--accent-dark)]" />
        <span className="min-w-0 flex-1">
          {tenant ? (
            <>
              <span className="block truncate text-sm font-medium text-[var(--navy)]">
                {tenant.name}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Globe2 className="h-3 w-3" /> {tenant.country}
              </span>
            </>
          ) : (
            <span className="block text-sm text-gray-500">{t("common.loading")}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <UserIcon className="h-3.5 w-3.5" />
              {user?.name ?? "—"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">{user?.email}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
