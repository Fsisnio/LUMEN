import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin-auth";
import { getOrganizations, listAllUsers } from "@/lib/data-store";
import { SUPERADMIN_ORG_ID } from "@/lib/superadmin-bootstrap";

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const [users, orgs] = await Promise.all([listAllUsers(), getOrganizations()]);
  const orgName = new Map(orgs.map((o) => [o.id, o.name] as const));

  const rows = users
    .filter((u) => u.organizationId !== SUPERADMIN_ORG_ID)
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      organizationId: u.organizationId,
      organizationName: orgName.get(u.organizationId) ?? "—",
      createdAt: u.createdAt,
      isSuperadmin: u.isSuperadmin === true,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json({ users: rows });
}
