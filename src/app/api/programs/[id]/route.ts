import { NextResponse } from "next/server";
import { getProgram, updateProgram, deleteProgram } from "@/lib/data-store";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const program = await getProgram(id, tenantId);
    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(program);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load program" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const body = await request.json();
    if ("organizationId" in body) delete body.organizationId;
    const program = await updateProgram(id, body, tenantId);
    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(program);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const ok = await deleteProgram(id, tenantId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete program" }, { status: 500 });
  }
}
