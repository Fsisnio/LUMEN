import { NextResponse } from "next/server";
import { updateOrganization, deleteOrganization } from "@/lib/data-store";
import { requireTenantId } from "@/lib/tenant";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantId(request);
    if (tenant instanceof NextResponse) return tenant;
    const { id } = await params;
    if (id !== tenant) {
      return NextResponse.json(
        { error: "You can only edit your own organization." },
        { status: 403 }
      );
    }
    const body = await request.json();
    const org = await updateOrganization(id, body);
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(org);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantId(request);
    if (tenant instanceof NextResponse) return tenant;
    const { id } = await params;
    if (id !== tenant) {
      return NextResponse.json(
        { error: "You can only delete your own organization." },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get("cascade") === "true";
    const result = await deleteOrganization(id, { cascade });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Cannot delete" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }
}
