import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

/**
 * `salt:hash` (both hex). Same parameters as signup/login for interchangeability.
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
