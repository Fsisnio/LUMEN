import { NextResponse } from "next/server";
import { getOrganization } from "@/lib/data-store";
import { requireTenantId } from "@/lib/tenant";

/**
 * Returns the authenticated user's organization (as a single-element array).
 * The legacy "list every org" behaviour was removed when the app became
 * multi-tenant — leaking other tenants' org names was a privacy issue.
 */
export async function GET(request: Request) {
  try {
    const tenant = await requireTenantId(request);
    if (tenant instanceof NextResponse) return tenant;
    const org = await getOrganization(tenant);
    return NextResponse.json(org ? [org] : []);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });
  }
}

/**
 * Org creation now happens exclusively through `/api/auth/signup`. Reject any
 * direct client POST so we don't end up with orphan organizations.
 */
export function POST() {
  return NextResponse.json(
    { error: "Use /api/auth/signup to create an organization." },
    { status: 405 }
  );
}
