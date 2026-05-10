import { NextResponse } from "next/server";
import { getBudgetLines, createBudgetLine } from "@/lib/data-store";
import { getTenantId, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const tenantId = await getTenantId(request);
    const list = await getBudgetLines({ projectId, tenantId });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load budget lines" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantId(request);
    if (typeof tenant !== "string") return tenant;
    const body = await request.json();
    const line = await createBudgetLine({ ...body, organizationId: tenant });
    return NextResponse.json(line);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create budget line" }, { status: 500 });
  }
}
