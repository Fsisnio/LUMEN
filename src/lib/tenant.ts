import { NextResponse } from "next/server";
import { readSession } from "./auth";

/**
 * Resolves the tenant id (= organization id) for a request.
 *
 * Priority:
 *   1. The authenticated session cookie (always wins; client cannot tamper).
 *   2. `?tenantId=` query string — only honored when there is no session
 *      (kept as an escape hatch for unauthenticated demos / scripts).
 *   3. `x-tenant-id` header — same caveat as query.
 *
 * Returning the session-bound tenant ALWAYS overrides any header/query, which
 * means even if a logged-in client tries to forge a different tenantId, the
 * server ignores it. Multi-tenant isolation is enforced server-side.
 */
export async function getTenantId(request: Request): Promise<string | null> {
  const session = await readSession();
  if (session) return session.organizationId;

  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("tenantId");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch {
    // ignore malformed URL
  }
  const header = request.headers.get("x-tenant-id");
  if (header && header.trim()) return header.trim();
  return null;
}

/**
 * Helper to enforce a tenant on protected routes. Returns the id or a 401
 * NextResponse to short-circuit the handler (401 because the most likely
 * reason for missing tenant is a missing/expired session).
 */
export async function requireTenantId(request: Request): Promise<string | NextResponse> {
  const id = await getTenantId(request);
  if (!id) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }
  return id;
}
