import { NextResponse } from "next/server";
import { getPrograms, createProgram } from "@/lib/data-store";
import { getTenantId, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const programs = await getPrograms(tenantId);
    return NextResponse.json(programs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load programs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantId(request);
    if (typeof tenant !== "string") return tenant;
    const body = await request.json();
    const program = await createProgram({ ...body, organizationId: tenant });
    return NextResponse.json(program);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
