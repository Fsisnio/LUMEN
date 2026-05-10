import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { PublicUser, Session, User } from "./types";
import {
  createSession as createSessionRow,
  deleteSession as deleteSessionRow,
  getSession as getSessionRow,
  getUserById,
} from "./data-store";

export const SESSION_COOKIE = "lumen-session";
const SESSION_DAYS = 30;

const SCRYPT_KEY_LENGTH = 64;

/**
 * Hash a plaintext password with a fresh random salt. Stored format is
 * `salt:hash` (both hex). scrypt is intentionally CPU-bound to slow brute force.
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let candidate: Buffer;
  try {
    candidate = scryptSync(plain, salt, SCRYPT_KEY_LENGTH);
  } catch {
    return false;
  }
  const reference = Buffer.from(hash, "hex");
  if (candidate.length !== reference.length) return false;
  return timingSafeEqual(candidate, reference);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function publicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u;
  return rest;
}

/** Read the session token from the request cookie. */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Read the active session row, if any (and not expired). */
export async function readSession(): Promise<Session | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const session = await getSessionRow(token);
  if (!session) return null;
  if (Date.parse(session.expiresAt) < Date.now()) {
    await deleteSessionRow(token);
    return null;
  }
  return session;
}

/** Returns the authenticated user (without password hash) or null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return publicUser(user);
}

/** Create + persist a session and write the cookie on the response. */
export async function startSession(
  user: User,
  res: NextResponse
): Promise<Session> {
  const session = await createSessionRow({
    token: newSessionToken(),
    userId: user.id,
    organizationId: user.organizationId,
    expiresAt: sessionExpiry(),
    createdAt: new Date().toISOString(),
  });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return session;
}

/** Tear down the active session (DB + cookie). */
export async function endSession(res: NextResponse): Promise<void> {
  const token = await readSessionToken();
  if (token) await deleteSessionRow(token);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
