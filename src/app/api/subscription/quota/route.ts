import { NextResponse } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import { getOrganization } from "@/lib/data-store";
import { getQuotaSnapshot } from "@/lib/subscription-quota";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenant = await requireTenantId(request);
  if (tenant instanceof NextResponse) return tenant;

  const org = await getOrganization(tenant);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  return NextResponse.json(getQuotaSnapshot(org));
}
