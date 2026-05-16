import type { Db } from "mongodb";
import { mongoDb } from "./mongo-connection";
import { isProductionBuild } from "./build-mode";
import type { DataStore } from "./app-store-schema";
import { getDefaultStore, migrateStoreInPlace, DEMO_ADMINS } from "./app-store-schema";
import { hashPassword, verifyPassword } from "./password-crypto";
import { ensureSuperadminMongo } from "./superadmin-bootstrap";
import type {
  Organization,
  Program,
  Project,
  Indicator,
  BudgetLine,
  RiskItem,
  User,
  Session,
} from "./types";

/** Collection names in the LUMEN database (relational-style “tables”). */
export const C = {
  organizations: "organizations",
  programs: "programs",
  projects: "projects",
  indicators: "indicators",
  budget_lines: "budget_lines",
  risks: "risks",
  users: "users",
  sessions: "sessions",
} as const;

/** Driver default infers `_id` as ObjectId; we use string business keys as `_id`. */
type MongoStrDoc = { _id: string } & Record<string, unknown>;

const LEGACY_SNAPSHOT_COLL = "app_store";
const LEGACY_SNAPSHOT_ID = "lumen_snapshot_v1";

function entityToDoc<T extends { id: string }>(e: T): MongoStrDoc {
  const o = e as unknown as { id: string } & Record<string, unknown>;
  const { id, ...rest } = o;
  return { _id: id, ...rest } as MongoStrDoc;
}

function docToEntity<T extends { id: string }>(raw: Record<string, unknown>): T {
  const { _id, ...rest } = raw;
  return { id: String(_id), ...rest } as T;
}

function sessionToDoc(s: Session): MongoStrDoc {
  return {
    _id: s.token,
    userId: s.userId,
    organizationId: s.organizationId,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
  } as MongoStrDoc;
}

function docToSession(raw: Record<string, unknown>): Session {
  return {
    token: String(raw._id),
    userId: String(raw.userId),
    organizationId: String(raw.organizationId),
    expiresAt: String(raw.expiresAt),
    createdAt: String(raw.createdAt),
  };
}

let ready: Promise<void> | null = null;

export function ensureMongoReady(): Promise<void> {
  if (!ready) ready = bootstrapMongo();
  return ready;
}

async function ensureCollection(db: Db, name: string) {
  const cols = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (cols.length === 0) await db.createCollection(name);
}

async function bootstrapMongo(): Promise<void> {
  const db = await mongoDb();
  for (const name of Object.values(C)) await ensureCollection(db, name);
  await ensureCollection(db, LEGACY_SNAPSHOT_COLL);

  await db.collection<MongoStrDoc>(C.programs).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.projects).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.projects).createIndex({ programId: 1 });
  await db.collection<MongoStrDoc>(C.indicators).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.indicators).createIndex({ projectId: 1 });
  await db.collection<MongoStrDoc>(C.indicators).createIndex({ programId: 1 });
  await db.collection<MongoStrDoc>(C.budget_lines).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.budget_lines).createIndex({ projectId: 1 });
  await db.collection<MongoStrDoc>(C.risks).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.risks).createIndex({ projectId: 1 });
  await db.collection<MongoStrDoc>(C.users).createIndex({ email: 1 }, { unique: true });
  await db.collection<MongoStrDoc>(C.sessions).createIndex({ userId: 1 });
  await db.collection<MongoStrDoc>(C.sessions).createIndex({ organizationId: 1 });
  await db.collection<MongoStrDoc>(C.sessions).createIndex({ expiresAt: 1 });

  await migrateLegacySnapshotIfAny(db);
  await seedIfOrganizationsEmpty(db);
  if (!isProductionBuild()) {
    await syncDemoAdminsMongo(db);
  }
  try {
    await ensureSuperadminMongo(db);
  } catch (err) {
    console.error("[superadmin] mongo bootstrap failed", err);
  }
}

/** Align Mongo demo admins with code (handles @caritas-* → @collaborative-* and rotated passwords). */
async function syncDemoAdminsMongo(db: Db): Promise<void> {
  const usersCol = db.collection<MongoStrDoc>(C.users);

  for (const demo of DEMO_ADMINS) {
    const orgExists = await db.collection<MongoStrDoc>(C.organizations).findOne({ _id: demo.orgId });
    if (!orgExists) continue;

    const canonicalId = `usr-${demo.orgId}`;
    const legacyEmail = demo.email.replace("collaborative", "caritas").toLowerCase();
    const demoEmail = demo.email.toLowerCase();

    let raw =
      (await usersCol.findOne({ _id: canonicalId })) ??
      (await usersCol.findOne({ email: demoEmail })) ??
      (await usersCol.findOne({ email: legacyEmail }));

    if (!raw) continue;

    const u = docToEntity<User>(raw as Record<string, unknown>);
    const emailOk = u.email.toLowerCase() === demoEmail;
    const passOk = verifyPassword(demo.password, u.passwordHash);
    const orgOk = u.organizationId === demo.orgId;
    const idOk = u.id === canonicalId;

    if (emailOk && passOk && orgOk && idOk) continue;

    await usersCol.deleteMany({ email: demoEmail, _id: { $ne: u.id } });

    const next: User = {
      ...u,
      id: canonicalId,
      email: demo.email.trim().toLowerCase(),
      organizationId: demo.orgId,
      passwordHash: hashPassword(demo.password),
    };

    if (u.id !== canonicalId) {
      await usersCol.deleteMany({ _id: { $in: [canonicalId, u.id] } });
      await usersCol.insertOne(entityToDoc(next));
    } else {
      await usersCol.replaceOne({ _id: canonicalId }, entityToDoc(next));
    }
  }
}

type LegacySnapshot = DataStore & { _id: typeof LEGACY_SNAPSHOT_ID };

async function migrateLegacySnapshotIfAny(db: Db) {
  if (isProductionBuild()) return;
  const leg = await db.collection<LegacySnapshot>(LEGACY_SNAPSHOT_COLL).findOne({ _id: LEGACY_SNAPSHOT_ID });
  if (!leg) return;
  const { _id, ...rest } = leg;
  void _id;
  const store = rest as DataStore;
  migrateStoreInPlace(store);
  await wipeAndInsertFullStore(db, store);
  await db.collection<MongoStrDoc>(LEGACY_SNAPSHOT_COLL).deleteOne({ _id: LEGACY_SNAPSHOT_ID });
}

async function seedIfOrganizationsEmpty(db: Db) {
  const n = await db.collection<MongoStrDoc>(C.organizations).countDocuments();
  if (n > 0) return;
  let store = getDefaultStore();
  migrateStoreInPlace(store);
  await wipeAndInsertFullStore(db, store);
}

async function wipeAndInsertFullStore(db: Db, store: DataStore) {
  for (const name of Object.values(C)) {
    await db.collection<MongoStrDoc>(name).deleteMany({});
  }
  const ins = async (coll: string, items: { id: string }[]) => {
    if (!items.length) return;
    await db.collection<MongoStrDoc>(coll).insertMany(
      items.map((x) => entityToDoc(x as { id: string })) as MongoStrDoc[]
    );
  };
  await ins(C.organizations, store.organizations);
  await ins(C.programs, store.programs);
  await ins(C.projects, store.projects);
  await ins(C.indicators, store.indicators as { id: string }[]);
  await ins(C.budget_lines, store.budgetLines);
  await ins(C.risks, store.risks);
  await ins(C.users, store.users);
  if (store.sessions.length)
    await db.collection<MongoStrDoc>(C.sessions).insertMany(store.sessions.map((s) => sessionToDoc(s)) as MongoStrDoc[]);
}

async function readAll(db: Db): Promise<DataStore> {
  const [orgs, progs, projs, inds, bls, rsks, users, sess] = await Promise.all([
    db.collection<MongoStrDoc>(C.organizations).find().toArray(),
    db.collection<MongoStrDoc>(C.programs).find().toArray(),
    db.collection<MongoStrDoc>(C.projects).find().toArray(),
    db.collection<MongoStrDoc>(C.indicators).find().toArray(),
    db.collection<MongoStrDoc>(C.budget_lines).find().toArray(),
    db.collection<MongoStrDoc>(C.risks).find().toArray(),
    db.collection<MongoStrDoc>(C.users).find().toArray(),
    db.collection<MongoStrDoc>(C.sessions).find().toArray(),
  ]);
  const as = <T extends { id: string }>(docs: Record<string, unknown>[]) =>
    docs.map((d) => docToEntity<T>(d));
  return {
    organizations: as<Organization>(orgs as Record<string, unknown>[]),
    programs: as<Program>(progs as Record<string, unknown>[]),
    projects: as<Project>(projs as Record<string, unknown>[]),
    indicators: as<Indicator>(inds as Record<string, unknown>[]),
    budgetLines: as<BudgetLine>(bls as Record<string, unknown>[]),
    risks: as<RiskItem>(rsks as Record<string, unknown>[]),
    users: as<User>(users as Record<string, unknown>[]),
    sessions: (sess as Record<string, unknown>[]).map(docToSession),
  };
}

export async function loadMongoAggregated(): Promise<DataStore> {
  await ensureMongoReady();
  return readAll(await mongoDb());
}

export async function saveMongoFullStore(store: DataStore): Promise<void> {
  await ensureMongoReady();
  await wipeAndInsertFullStore(await mongoDb(), store);
}

function scoped<T extends { organizationId?: string }>(list: T[], tenantId?: string | null): T[] {
  if (!tenantId) return list;
  return list.filter((x) => x.organizationId === tenantId);
}

export async function mongoGetProjects(tenantId?: string | null): Promise<Project[]> {
  await ensureMongoReady();
  const db = await mongoDb();
  const filter = tenantId ? { organizationId: tenantId } : {};
  const docs = await db.collection<MongoStrDoc>(C.projects).find(filter).toArray();
  return docs.map((d) => docToEntity<Project>(d as Record<string, unknown>));
}

export async function mongoGetProject(id: string, tenantId?: string | null): Promise<Project | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const d = await db.collection<MongoStrDoc>(C.projects).findOne({ _id: id });
  if (!d) return null;
  const p = docToEntity<Project>(d as Record<string, unknown>);
  if (tenantId && p.organizationId !== tenantId) return null;
  return p;
}

export async function mongoCreateProject(data: Omit<Project, "id">): Promise<Project> {
  if (!data.organizationId) throw new Error("organizationId is required");
  await ensureMongoReady();
  const id = `prj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const project: Project = { ...data, id };
  await (await mongoDb()).collection<MongoStrDoc>(C.projects).insertOne(entityToDoc(project));
  return project;
}

export async function mongoUpdateProject(
  id: string,
  data: Partial<Project>,
  tenantId?: string | null
): Promise<Project | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.projects).findOne({ _id: id });
  if (!prev) return null;
  const merged = docToEntity<Project>(prev as Record<string, unknown>);
  if (tenantId && merged.organizationId !== tenantId) return null;
  const next = { ...merged, ...data, id };
  await db.collection<MongoStrDoc>(C.projects).replaceOne({ _id: id }, entityToDoc(next));
  return next;
}

export async function mongoDeleteProject(id: string, tenantId?: string | null): Promise<boolean> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.projects).findOne({ _id: id });
  if (!prev) return false;
  const p = docToEntity<Project>(prev as Record<string, unknown>);
  if (tenantId && p.organizationId !== tenantId) return false;
  await db.collection<MongoStrDoc>(C.projects).deleteOne({ _id: id });
  await db.collection<MongoStrDoc>(C.indicators).deleteMany({ projectId: id });
  await db.collection<MongoStrDoc>(C.budget_lines).deleteMany({ projectId: id });
  await db.collection<MongoStrDoc>(C.risks).deleteMany({ projectId: id });
  return true;
}

export async function mongoGetPrograms(tenantId?: string | null): Promise<Program[]> {
  await ensureMongoReady();
  const db = await mongoDb();
  const filter = tenantId ? { organizationId: tenantId } : {};
  const docs = await db.collection<MongoStrDoc>(C.programs).find(filter).toArray();
  return docs.map((d) => docToEntity<Program>(d as Record<string, unknown>));
}

export async function mongoGetProgram(id: string, tenantId?: string | null): Promise<Program | null> {
  await ensureMongoReady();
  const d = await (await mongoDb()).collection<MongoStrDoc>(C.programs).findOne({ _id: id });
  if (!d) return null;
  const p = docToEntity<Program>(d as Record<string, unknown>);
  if (tenantId && p.organizationId !== tenantId) return null;
  return p;
}

export async function mongoCreateProgram(data: Omit<Program, "id">): Promise<Program> {
  if (!data.organizationId) throw new Error("organizationId is required");
  await ensureMongoReady();
  const id = `prog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const program: Program = { ...data, id };
  await (await mongoDb()).collection<MongoStrDoc>(C.programs).insertOne(entityToDoc(program));
  return program;
}

export async function mongoUpdateProgram(
  id: string,
  data: Partial<Program>,
  tenantId?: string | null
): Promise<Program | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.programs).findOne({ _id: id });
  if (!prev) return null;
  const merged = docToEntity<Program>(prev as Record<string, unknown>);
  if (tenantId && merged.organizationId !== tenantId) return null;
  const next = { ...merged, ...data, id };
  await db.collection<MongoStrDoc>(C.programs).replaceOne({ _id: id }, entityToDoc(next));
  return next;
}

export async function mongoDeleteProgram(id: string, tenantId?: string | null): Promise<boolean> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.programs).findOne({ _id: id });
  if (!prev) return false;
  const prog = docToEntity<Program>(prev as Record<string, unknown>);
  if (tenantId && prog.organizationId !== tenantId) return false;

  const projectIds = (
    await db
      .collection<MongoStrDoc>(C.projects)
      .find({ programId: id })
      .project({ _id: 1 })
      .toArray()
  ).map((x) => String(x._id));

  await db.collection<MongoStrDoc>(C.projects).deleteMany({ programId: id });
  await db.collection<MongoStrDoc>(C.indicators).deleteMany({
    $or: [{ programId: id }, { projectId: { $in: projectIds } }],
  });
  await db.collection<MongoStrDoc>(C.budget_lines).deleteMany({ projectId: { $in: projectIds } });
  await db.collection<MongoStrDoc>(C.risks).deleteMany({ projectId: { $in: projectIds } });
  await db.collection<MongoStrDoc>(C.programs).deleteOne({ _id: id });
  return true;
}

export async function mongoGetIndicators(filters?: {
  projectId?: string;
  programId?: string;
  tenantId?: string | null;
}): Promise<Indicator[]> {
  await ensureMongoReady();
  const db = await mongoDb();
  let filter: Record<string, unknown> = {};
  if (filters?.tenantId) filter.organizationId = filters.tenantId;
  if (filters?.projectId) filter.projectId = filters.projectId;
  if (filters?.programId) filter.programId = filters.programId;
  const docs = await db.collection<MongoStrDoc>(C.indicators).find(filter).toArray();
  return docs.map((d) => docToEntity<Indicator>(d as Record<string, unknown>));
}

export async function mongoCreateIndicator(data: Omit<Indicator, "id">): Promise<Indicator> {
  if (!data.organizationId) throw new Error("organizationId is required");
  await ensureMongoReady();
  const id = `ind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const raw: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>), id };
  if (raw.projectId == null) delete raw.projectId;
  if (raw.programId == null) delete raw.programId;
  const indicator = raw as unknown as Indicator;
  await (await mongoDb()).collection<MongoStrDoc>(C.indicators).insertOne(entityToDoc(indicator));
  return indicator;
}

export async function mongoUpdateIndicator(
  id: string,
  data: Partial<Indicator>,
  tenantId?: string | null
): Promise<Indicator | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.indicators).findOne({ _id: id });
  if (!prev) return null;
  const cur = docToEntity<Indicator>(prev as Record<string, unknown>);
  if (tenantId && cur.organizationId !== tenantId) return null;
  const merged: Record<string, unknown> = { ...cur };
  const patch = data as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  const next = merged as unknown as Indicator;
  const doc = entityToDoc(next);
  if (!("projectId" in next) || next.projectId === undefined) delete doc.projectId;
  if (!("programId" in next) || next.programId === undefined) delete doc.programId;
  await db.collection<MongoStrDoc>(C.indicators).replaceOne({ _id: id }, doc);
  return next;
}

export async function mongoDeleteIndicator(id: string, tenantId?: string | null): Promise<boolean> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.indicators).findOne({ _id: id });
  if (!prev) return false;
  const ind = docToEntity<Indicator>(prev as Record<string, unknown>);
  if (tenantId && ind.organizationId !== tenantId) return false;
  await db.collection<MongoStrDoc>(C.indicators).deleteOne({ _id: id });
  return true;
}

export async function mongoGetOrganizations(): Promise<Organization[]> {
  await ensureMongoReady();
  const docs = await (await mongoDb()).collection<MongoStrDoc>(C.organizations).find().toArray();
  return docs.map((d) => docToEntity<Organization>(d as Record<string, unknown>));
}

export async function mongoGetOrganization(id: string): Promise<Organization | null> {
  await ensureMongoReady();
  const d = await (await mongoDb()).collection<MongoStrDoc>(C.organizations).findOne({ _id: id });
  return d ? docToEntity<Organization>(d as Record<string, unknown>) : null;
}

export async function mongoCreateOrganization(data: Omit<Organization, "id">): Promise<Organization> {
  if (!data.country?.trim()) throw new Error("country is required");
  await ensureMongoReady();
  const id = `org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const org: Organization = { ...data, id };
  await (await mongoDb()).collection<MongoStrDoc>(C.organizations).insertOne(entityToDoc(org));
  return org;
}

export async function mongoUpdateOrganization(id: string, data: Partial<Organization>): Promise<Organization | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.organizations).findOne({ _id: id });
  if (!prev) return null;
  const merged = { ...docToEntity<Organization>(prev as Record<string, unknown>), ...data };
  for (const k of Object.keys(data) as (keyof Organization)[]) {
    if (data[k] === undefined) {
      delete (merged as Record<string, unknown>)[k as string];
    }
  }
  const nextOrg = { ...merged, id } as Organization;
  await db.collection<MongoStrDoc>(C.organizations).replaceOne({ _id: id }, entityToDoc(nextOrg));
  return nextOrg;
}

export async function mongoDeleteOrganization(
  id: string,
  options?: { cascade?: boolean }
): Promise<{ ok: boolean; reason?: string }> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.organizations).findOne({ _id: id });
  if (!prev) return { ok: false, reason: "Not found." };

  const inUse = (await db.collection<MongoStrDoc>(C.programs).countDocuments({ organizationId: id })) > 0;
  if (inUse && !options?.cascade) {
    return {
      ok: false,
      reason: "Programs still reference this organization. Delete with cascade to remove all data.",
    };
  }

  if (options?.cascade) {
    await db.collection<MongoStrDoc>(C.programs).deleteMany({ organizationId: id });
    await db.collection<MongoStrDoc>(C.projects).deleteMany({ organizationId: id });
    await db.collection<MongoStrDoc>(C.indicators).deleteMany({ organizationId: id });
    await db.collection<MongoStrDoc>(C.budget_lines).deleteMany({ organizationId: id });
    await db.collection<MongoStrDoc>(C.risks).deleteMany({ organizationId: id });
    await db.collection<MongoStrDoc>(C.users).deleteMany({ organizationId: id });
  }

  await db.collection<MongoStrDoc>(C.organizations).deleteOne({ _id: id });
  return { ok: true };
}

export async function mongoGetBudgetLines(filters?: { projectId?: string; tenantId?: string | null }) {
  await ensureMongoReady();
  const db = await mongoDb();
  let q: Record<string, unknown> = {};
  if (filters?.tenantId) q.organizationId = filters.tenantId;
  if (filters?.projectId) q.projectId = filters.projectId;
  const docs = await db.collection<MongoStrDoc>(C.budget_lines).find(q).toArray();
  let list = docs.map((d) => docToEntity<BudgetLine>(d as Record<string, unknown>));
  if (filters?.tenantId) list = scoped(list, filters.tenantId);
  return list;
}

export async function mongoCreateBudgetLine(data: Omit<BudgetLine, "id">): Promise<BudgetLine> {
  if (!data.organizationId) throw new Error("organizationId is required");
  await ensureMongoReady();
  const id = `bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const line: BudgetLine = { ...data, id };
  await (await mongoDb()).collection<MongoStrDoc>(C.budget_lines).insertOne(entityToDoc(line));
  return line;
}

export async function mongoUpdateBudgetLine(
  id: string,
  data: Partial<BudgetLine>,
  tenantId?: string | null
): Promise<BudgetLine | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.budget_lines).findOne({ _id: id });
  if (!prev) return null;
  const cur = docToEntity<BudgetLine>(prev as Record<string, unknown>);
  if (tenantId && cur.organizationId !== tenantId) return null;
  const next = { ...cur, ...data, id };
  await db.collection<MongoStrDoc>(C.budget_lines).replaceOne({ _id: id }, entityToDoc(next));
  return next;
}

export async function mongoDeleteBudgetLine(id: string, tenantId?: string | null): Promise<boolean> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.budget_lines).findOne({ _id: id });
  if (!prev) return false;
  const b = docToEntity<BudgetLine>(prev as Record<string, unknown>);
  if (tenantId && b.organizationId !== tenantId) return false;
  await db.collection<MongoStrDoc>(C.budget_lines).deleteOne({ _id: id });
  return true;
}

export async function mongoGetRisks(filters?: { projectId?: string; tenantId?: string | null }) {
  await ensureMongoReady();
  const db = await mongoDb();
  let q: Record<string, unknown> = {};
  if (filters?.tenantId) q.organizationId = filters.tenantId;
  if (filters?.projectId) q.projectId = filters.projectId;
  const docs = await db.collection<MongoStrDoc>(C.risks).find(q).toArray();
  let list = docs.map((d) => docToEntity<RiskItem>(d as Record<string, unknown>));
  if (filters?.tenantId) list = scoped(list, filters.tenantId);
  return list;
}

export async function mongoCreateRisk(data: Omit<RiskItem, "id">): Promise<RiskItem> {
  if (!data.organizationId) throw new Error("organizationId is required");
  await ensureMongoReady();
  const id = `risk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const risk: RiskItem = { ...data, id };
  await (await mongoDb()).collection<MongoStrDoc>(C.risks).insertOne(entityToDoc(risk));
  return risk;
}

export async function mongoUpdateRisk(
  id: string,
  data: Partial<RiskItem>,
  tenantId?: string | null
): Promise<RiskItem | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.risks).findOne({ _id: id });
  if (!prev) return null;
  const cur = docToEntity<RiskItem>(prev as Record<string, unknown>);
  if (tenantId && cur.organizationId !== tenantId) return null;
  const next = { ...cur, ...data, id };
  await db.collection<MongoStrDoc>(C.risks).replaceOne({ _id: id }, entityToDoc(next));
  return next;
}

export async function mongoDeleteRisk(id: string, tenantId?: string | null): Promise<boolean> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.risks).findOne({ _id: id });
  if (!prev) return false;
  const r = docToEntity<RiskItem>(prev as Record<string, unknown>);
  if (tenantId && r.organizationId !== tenantId) return false;
  await db.collection<MongoStrDoc>(C.risks).deleteOne({ _id: id });
  return true;
}

export async function mongoGetFullStore(tenantId?: string | null): Promise<Omit<DataStore, "users" | "sessions">> {
  const store = await loadMongoAggregated();
  if (!tenantId) {
    return {
      organizations: store.organizations,
      programs: store.programs,
      projects: store.projects,
      indicators: store.indicators,
      budgetLines: store.budgetLines,
      risks: store.risks,
    };
  }
  return {
    organizations: store.organizations,
    programs: scoped(store.programs, tenantId),
    projects: scoped(store.projects, tenantId),
    indicators: scoped(store.indicators, tenantId),
    budgetLines: scoped(store.budgetLines, tenantId),
    risks: scoped(store.risks, tenantId),
  };
}

export async function mongoGetUserById(id: string): Promise<User | null> {
  await ensureMongoReady();
  const d = await (await mongoDb()).collection<MongoStrDoc>(C.users).findOne({ _id: id });
  return d ? docToEntity<User>(d as Record<string, unknown>) : null;
}

export async function mongoGetUserByEmail(email: string): Promise<User | null> {
  await ensureMongoReady();
  const d = await (await mongoDb())
    .collection<MongoStrDoc>(C.users)
    .findOne({ email: email.trim().toLowerCase() });
  return d ? docToEntity<User>(d as Record<string, unknown>) : null;
}

export async function mongoListUsersByOrganization(organizationId: string): Promise<User[]> {
  await ensureMongoReady();
  const docs = await (await mongoDb())
    .collection<MongoStrDoc>(C.users)
    .find({ organizationId })
    .toArray();
  return docs.map((d) => docToEntity<User>(d as Record<string, unknown>));
}

export async function mongoCreateUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (!data.email?.trim()) throw new Error("email is required");
  await ensureMongoReady();
  const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const user: User = {
    ...data,
    email: data.email.trim().toLowerCase(),
    id,
    createdAt: new Date().toISOString(),
  };
  await (await mongoDb()).collection<MongoStrDoc>(C.users).insertOne(entityToDoc(user));
  return user;
}

export async function mongoUpdateUser(id: string, data: Partial<User>): Promise<User | null> {
  await ensureMongoReady();
  const db = await mongoDb();
  const prev = await db.collection<MongoStrDoc>(C.users).findOne({ _id: id });
  if (!prev) return null;
  const cur = docToEntity<User>(prev as Record<string, unknown>);
  const next = { ...cur, ...data, id };
  await db.collection<MongoStrDoc>(C.users).replaceOne({ _id: id }, entityToDoc(next));
  return next;
}

export async function mongoCreateSession(data: Session): Promise<Session> {
  await ensureMongoReady();
  const db = await mongoDb();
  const now = Date.now();
  const all = await db.collection<MongoStrDoc>(C.sessions).find({}).toArray();
  const staleIds = all.filter((s) => Date.parse(String(s.expiresAt)) <= now).map((s) => s._id);
  if (staleIds.length) await db.collection<MongoStrDoc>(C.sessions).deleteMany({ _id: { $in: staleIds } });
  await db.collection<MongoStrDoc>(C.sessions).insertOne(sessionToDoc(data));
  return data;
}

export async function mongoGetSession(token: string): Promise<Session | null> {
  await ensureMongoReady();
  const d = await (await mongoDb()).collection<MongoStrDoc>(C.sessions).findOne({ _id: token });
  return d ? docToSession(d as Record<string, unknown>) : null;
}

export async function mongoDeleteSession(token: string): Promise<boolean> {
  await ensureMongoReady();
  const r = await (await mongoDb()).collection<MongoStrDoc>(C.sessions).deleteOne({ _id: token });
  return r.deletedCount === 1;
}
