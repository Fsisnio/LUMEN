import { NextResponse } from "next/server";
import { updateBudgetLine, deleteBudgetLine } from "@/lib/data-store";
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
    const line = await updateBudgetLine(id, body, tenantId);
    if (!line) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(line);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update budget line" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId(request);
    const ok = await deleteBudgetLine(id, tenantId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete budget line" }, { status: 500 });
  }
}
