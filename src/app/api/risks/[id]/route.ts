import { NextResponse } from "next/server";
import { updateRisk, deleteRisk } from "@/lib/data-store";
import { getTenantId } from "@/lib/tenant";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const body = await request.json();
    if ("organizationId" in body) delete body.organizationId;
    const risk = await updateRisk(id, body, tenantId);
    if (!risk) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(risk);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update risk" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const ok = await deleteRisk(id, tenantId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete risk" }, { status: 500 });
  }
}
