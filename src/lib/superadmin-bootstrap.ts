import type { Db } from "mongodb";
import type { DataStore } from "./app-store-schema";
import { hashPassword, verifyPassword } from "./password-crypto";
import type { Organization, User } from "./types";

/** Reserved system tenant that hosts the platform-wide superadmin. */
export const SUPERADMIN_ORG_ID = "org-system";
export const SUPERADMIN_USER_ID = "usr-superadmin";

const DEFAULTS = {
  email: "superadmin@lumen.app",
  name: "Lumen Superadmin",
  password: "Lumen!Superadmin2026",
} as const;

export interface SuperadminConfig {
  email: string;
  name: string;
  password: string;
  /** True when `SUPERADMIN_PASSWORD` was supplied; otherwise we will not overwrite an existing hash. */
  passwordFromEnv: boolean;
}

export function readSuperadminConfig(): SuperadminConfig {
  const envEmail = process.env.SUPERADMIN_EMAIL?.trim();
  const envPassword = process.env.SUPERADMIN_PASSWORD?.trim();
  const envName = process.env.SUPERADMIN_NAME?.trim();
  return {
    email: (envEmail && envEmail.length > 0 ? envEmail : DEFAULTS.email).toLowerCase(),
    name: envName && envName.length > 0 ? envName : DEFAULTS.name,
    password: envPassword && envPassword.length > 0 ? envPassword : DEFAULTS.password,
    passwordFromEnv: !!envPassword && envPassword.length > 0,
  };
}

function buildSystemOrganization(): Organization {
  return {
    id: SUPERADMIN_ORG_ID,
    name: "Lumen System",
    type: "National Office",
    country: "Global",
  };
}

function buildSuperadminUser(cfg: SuperadminConfig): User {
  return {
    id: SUPERADMIN_USER_ID,
    email: cfg.email,
    name: cfg.name,
    organizationId: SUPERADMIN_ORG_ID,
    role: "Executive Director",
    passwordHash: hashPassword(cfg.password),
    createdAt: new Date().toISOString(),
    isSuperadmin: true,
  };
}

/** Idempotent in-place upsert for the JSON file backend. */
export function ensureSuperadminInPlace(store: DataStore): boolean {
  const cfg = readSuperadminConfig();
  let changed = false;

  const orgIdx = store.organizations.findIndex((o) => o.id === SUPERADMIN_ORG_ID);
  if (orgIdx === -1) {
    store.organizations.push(buildSystemOrganization());
    changed = true;
  }

  const existing = store.users.find((u) => u.id === SUPERADMIN_USER_ID || u.email.toLowerCase() === cfg.email);

  if (!existing) {
    store.users.push(buildSuperadminUser(cfg));
    return true;
  }

  if (existing.id !== SUPERADMIN_USER_ID) {
    store.users = store.users.filter((u) => u.id !== SUPERADMIN_USER_ID);
    existing.id = SUPERADMIN_USER_ID;
    changed = true;
  }
  if (existing.email.toLowerCase() !== cfg.email) {
    existing.email = cfg.email;
    changed = true;
  }
  if (existing.name !== cfg.name) {
    existing.name = cfg.name;
    changed = true;
  }
  if (existing.organizationId !== SUPERADMIN_ORG_ID) {
    existing.organizationId = SUPERADMIN_ORG_ID;
    changed = true;
  }
  if (existing.isSuperadmin !== true) {
    existing.isSuperadmin = true;
    changed = true;
  }
  if (cfg.passwordFromEnv && !verifyPassword(cfg.password, existing.passwordHash)) {
    existing.passwordHash = hashPassword(cfg.password);
    changed = true;
  }
  return changed;
}

type MongoStrDoc = { _id: string } & Record<string, unknown>;

/** Idempotent Mongo upsert (called from {@link bootstrapMongo}). */
export async function ensureSuperadminMongo(db: Db): Promise<void> {
  const cfg = readSuperadminConfig();

  const orgs = db.collection<MongoStrDoc>("organizations");
  const users = db.collection<MongoStrDoc>("users");

  const orgExists = await orgs.findOne({ _id: SUPERADMIN_ORG_ID });
  if (!orgExists) {
    const o = buildSystemOrganization();
    const { id, ...rest } = o;
    await orgs.insertOne({ _id: id, ...rest } as MongoStrDoc);
  }

  const byId = await users.findOne({ _id: SUPERADMIN_USER_ID });
  const byEmail = byId ? null : await users.findOne({ email: cfg.email });

  if (!byId && !byEmail) {
    const u = buildSuperadminUser(cfg);
    const { id, ...rest } = u;
    await users.insertOne({ _id: id, ...rest } as MongoStrDoc);
    return;
  }

  const current = (byId ?? byEmail) as MongoStrDoc;

  const next: MongoStrDoc = {
    ...current,
    _id: SUPERADMIN_USER_ID,
    email: cfg.email,
    name: cfg.name,
    organizationId: SUPERADMIN_ORG_ID,
    role: "Executive Director",
    isSuperadmin: true,
    createdAt: (current.createdAt as string) ?? new Date().toISOString(),
  };

  const currentHash = typeof current.passwordHash === "string" ? current.passwordHash : "";
  if (cfg.passwordFromEnv && !verifyPassword(cfg.password, currentHash)) {
    next.passwordHash = hashPassword(cfg.password);
  } else if (!currentHash) {
    next.passwordHash = hashPassword(cfg.password);
  }

  if (current._id && current._id !== SUPERADMIN_USER_ID) {
    await users.deleteOne({ _id: current._id });
  }
  await users.replaceOne({ _id: SUPERADMIN_USER_ID }, next, { upsert: true });
}
