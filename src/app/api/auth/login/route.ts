import { NextResponse } from "next/server";
import { getUserByEmail, getOrganization } from "@/lib/data-store";
import { publicUser, startSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { email, password } = (body ?? {}) as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  // Use a dummy verify even on miss to avoid leaking timing.
  const ok = user
    ? verifyPassword(password, user.passwordHash)
    : verifyPassword(password, "0000:0000");
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const tenant = await getOrganization(user.organizationId);
  const res = NextResponse.json({ user: publicUser(user), tenant });
  await startSession(user, res);
  return res;
}
