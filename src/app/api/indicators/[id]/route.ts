import { NextResponse } from "next/server";
import { updateIndicator, deleteIndicator } from "@/lib/data-store";
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
    const indicator = await updateIndicator(id, body, tenantId);
    if (!indicator) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(indicator);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update indicator" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const ok = await deleteIndicator(id, tenantId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete indicator" }, { status: 500 });
  }
}
