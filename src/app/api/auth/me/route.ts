import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrganization } from "@/lib/data-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, tenant: null }, { status: 200 });
  const tenant = await getOrganization(user.organizationId);
  return NextResponse.json({ user, tenant });
}
