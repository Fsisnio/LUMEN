import { NextResponse } from "next/server";
import { MongoServerError } from "mongodb";
import { getCurrentUser, hashPassword, publicUser } from "@/lib/auth";
import { createUser, getUserByEmail, listUsersByOrganization } from "@/lib/data-store";
import { isOrganizationAdministrator, isInvitableMemberRole } from "@/lib/org-permissions";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOrganizationAdministrator(me.role)) {
    return NextResponse.json({ error: "Only the organization administrator can list members." }, { status: 403 });
  }

  const rows = await listUsersByOrganization(me.organizationId);
  return NextResponse.json({ users: rows.map((u) => publicUser(u)) });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOrganizationAdministrator(me.role)) {
    return NextResponse.json(
      { error: "Only the organization administrator can create member accounts." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { name?: string; email?: string; password?: string; role?: string };
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!isInvitableMemberRole(b.role)) {
    return NextResponse.json({ error: "Invalid or non-assignable role." }, { status: 400 });
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  try {
    const user = await createUser({
      name,
      email,
      organizationId: me.organizationId,
      role: b.role,
      passwordHash: hashPassword(password),
    });
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw e;
  }
}
