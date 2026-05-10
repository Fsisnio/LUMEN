import { NextResponse } from "next/server";
import { getFullStore } from "@/lib/data-store";
import { getTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const store = await getFullStore(tenantId);
    return NextResponse.json(store);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
