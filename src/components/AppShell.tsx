"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { AuthGate } from "./AuthGate";
import { Footer } from "./Footer";
import { useLocale } from "@/contexts/LocaleContext";

const PUBLIC_PREFIXES = ["/login", "/signup"];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="relative flex min-h-screen">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-[39] bg-black/45 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-[41] flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 shadow-sm sm:h-14 sm:px-4 lg:hidden">
          <button
            type="button"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            aria-label={t("nav.openMenu")}
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-[var(--navy)] hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </button>
          <span className="font-display text-lg font-semibold text-[var(--navy)]">Lumen</span>
          <span className="hidden text-[10px] uppercase tracking-wide text-gray-400 sm:inline">CARIPRIP</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

/**
 * Top-level UI shell. Public routes (login / signup) render bare, every
 * other route is wrapped in the sidebar layout and gated behind authentication.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="min-w-0 flex-1">{children}</main>
        <Footer />
      </div>
    );
  }
  return (
    <AuthGate>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthGate>
  );
}
