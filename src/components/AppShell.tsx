"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { AuthGate } from "./AuthGate";
import { Footer } from "./Footer";

const PUBLIC_PREFIXES = ["/login", "/signup"];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );
  }
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="ml-64 flex flex-1 min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    </AuthGate>
  );
}
