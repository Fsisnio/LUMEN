import { NextResponse } from "next/server";
import {
  createOrganization,
  createUser,
  getOrganization,
  getUserByEmail,
} from "@/lib/data-store";
import { hashPassword, publicUser, startSession } from "@/lib/auth";
import type { Organization, UserRole } from "@/lib/types";

interface SignupBody {
  user: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  };
  organization: Omit<Organization, "id">;
}

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const u = body.user;
  const o = body.organization;

  if (!u?.name?.trim() || !u?.email?.trim() || !u?.password) {
    return NextResponse.json(
      { error: "User name, email and password are required." },
      { status: 400 }
    );
  }
  if (u.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (!o?.name?.trim() || !o?.country?.trim() || !o?.type) {
    return NextResponse.json(
      { error: "Organization name, type and country are required." },
      { status: 400 }
    );
  }

  if (await getUserByEmail(u.email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const organization = await createOrganization({
    name: o.name.trim(),
    type: o.type,
    country: o.country.trim(),
    region: o.region?.toString().trim() || undefined,
    diocese: o.diocese?.toString().trim() || undefined,
  });

  const user = await createUser({
    name: u.name.trim(),
    email: u.email.trim().toLowerCase(),
    organizationId: organization.id,
    role: u.role ?? "Executive Director",
    passwordHash: hashPassword(u.password),
  });

  const tenant = await getOrganization(organization.id);
  const res = NextResponse.json(
    { user: publicUser(user), tenant },
    { status: 201 }
  );
  await startSession(user, res);
  return res;
}
