import { NextResponse } from "next/server";
import { getIndicators, createIndicator } from "@/lib/data-store";
import { getTenantId, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const programId = searchParams.get("programId") ?? undefined;
    const tenantId = await getTenantId(request);
    const indicators = await getIndicators({ projectId, programId, tenantId });
    return NextResponse.json(indicators);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load indicators" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantId(request);
    if (typeof tenant !== "string") return tenant;
    const body = await request.json();
    const indicator = await createIndicator({ ...body, organizationId: tenant });
    return NextResponse.json(indicator);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create indicator" }, { status: 500 });
  }
}
