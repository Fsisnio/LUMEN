import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { getUserById } from "./data-store";

/**
 * Authorises a server route for the superadmin only. Resolves to the user
 * when allowed, or returns a JSON 401/403 response to be returned by the caller.
 */
export async function requireSuperadmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getCurrentUser();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  const full = await getUserById(session.id);
  if (!full || full.isSuperadmin !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Superadmin access required." }, { status: 403 }),
    };
  }
  return { ok: true, userId: full.id };
}
