"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { AuthGate } from "./AuthGate";

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
    return <main className="min-h-screen">{children}</main>;
  }
  return (
    <AuthGate>
      <div className="flex">
        <Sidebar />
        <main className="ml-64 flex-1 min-h-screen">{children}</main>
      </div>
    </AuthGate>
  );
}
