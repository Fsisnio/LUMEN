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
import { promises as fs } from "fs";
import path from "path";
import type { DataStore } from "./app-store-schema";
import { getDefaultStore, migrateStoreInPlace } from "./app-store-schema";
import { useMongoBackend } from "./mongo-connection";
import {
  loadMongoAggregated,
  saveMongoFullStore,
  mongoGetProjects,
  mongoGetProject,
  mongoCreateProject,
  mongoUpdateProject,
  mongoDeleteProject,
  mongoGetPrograms,
  mongoGetProgram,
  mongoCreateProgram,
  mongoUpdateProgram,
  mongoDeleteProgram,
  mongoGetIndicators,
  mongoCreateIndicator,
  mongoUpdateIndicator,
  mongoDeleteIndicator,
  mongoGetOrganizations,
  mongoGetOrganization,
  mongoCreateOrganization,
  mongoUpdateOrganization,
  mongoDeleteOrganization,
  mongoGetBudgetLines,
  mongoCreateBudgetLine,
  mongoUpdateBudgetLine,
  mongoDeleteBudgetLine,
  mongoGetRisks,
  mongoCreateRisk,
  mongoUpdateRisk,
  mongoDeleteRisk,
  mongoGetFullStore,
  mongoGetUserById,
  mongoGetUserByEmail,
  mongoCreateUser,
  mongoUpdateUser,
  mongoCreateSession,
  mongoGetSession,
  mongoDeleteSession,
} from "./mongo-collections";

export type { DataStore };

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

async function ensureDataDir() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
}

async function loadFileStore(): Promise<DataStore> {
  let store: DataStore;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    store = JSON.parse(raw) as DataStore;
  } catch {
    store = getDefaultStore();
  }
  const { changed } = migrateStoreInPlace(store);
  if (changed) {
    try {
      await saveFileStore(store);
    } catch {
      /* best effort */
    }
  }
  return store;
}

async function saveFileStore(store: DataStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

/** Full snapshot (JSON file or Mongo aggregate). Used when code still loads the whole blob. */
export async function loadStore(): Promise<DataStore> {
  if (useMongoBackend()) return loadMongoAggregated();
  return loadFileStore();
}

export async function saveStore(store: DataStore): Promise<void> {
  if (useMongoBackend()) {
    await saveMongoFullStore(store);
    return;
  }
  await saveFileStore(store);
}

function scoped<T extends { organizationId?: string }>(list: T[], tenantId?: string | null): T[] {
  if (!tenantId) return list;
  return list.filter((item) => item.organizationId === tenantId);
}

export async function getProjects(tenantId?: string | null): Promise<Project[]> {
  if (useMongoBackend()) return mongoGetProjects(tenantId);
  const store = await loadFileStore();
  return scoped(store.projects, tenantId);
}

export async function getProject(id: string, tenantId?: string | null): Promise<Project | null> {
  if (useMongoBackend()) return mongoGetProject(id, tenantId);
  const store = await loadFileStore();
  const found = store.projects.find((p) => p.id === id);
  if (!found) return null;
  if (tenantId && found.organizationId !== tenantId) return null;
  return found;
}

export async function createProject(data: Omit<Project, "id">): Promise<Project> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (useMongoBackend()) return mongoCreateProject(data);
  const store = await loadFileStore();
  const id = `prj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const project: Project = { ...data, id };
  store.projects.push(project);
  await saveFileStore(store);
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<Project>,
  tenantId?: string | null
): Promise<Project | null> {
  if (useMongoBackend()) return mongoUpdateProject(id, data, tenantId);
  const store = await loadFileStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  if (tenantId && store.projects[idx].organizationId !== tenantId) return null;
  store.projects[idx] = { ...store.projects[idx], ...data };
  await saveFileStore(store);
  return store.projects[idx];
}

export async function deleteProject(id: string, tenantId?: string | null): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteProject(id, tenantId);
  const store = await loadFileStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (tenantId && store.projects[idx].organizationId !== tenantId) return false;
  store.projects.splice(idx, 1);
  store.indicators = store.indicators.filter((i) => i.projectId !== id);
  store.budgetLines = store.budgetLines.filter((b) => b.projectId !== id);
  store.risks = store.risks.filter((r) => r.projectId !== id);
  await saveFileStore(store);
  return true;
}

export async function getPrograms(tenantId?: string | null): Promise<Program[]> {
  if (useMongoBackend()) return mongoGetPrograms(tenantId);
  const store = await loadFileStore();
  return scoped(store.programs, tenantId);
}

export async function getProgram(id: string, tenantId?: string | null): Promise<Program | null> {
  if (useMongoBackend()) return mongoGetProgram(id, tenantId);
  const store = await loadFileStore();
  const found = store.programs.find((p) => p.id === id);
  if (!found) return null;
  if (tenantId && found.organizationId !== tenantId) return null;
  return found;
}

export async function createProgram(data: Omit<Program, "id">): Promise<Program> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (useMongoBackend()) return mongoCreateProgram(data);
  const store = await loadFileStore();
  const id = `prog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const program: Program = { ...data, id };
  store.programs.push(program);
  await saveFileStore(store);
  return program;
}

export async function updateProgram(
  id: string,
  data: Partial<Program>,
  tenantId?: string | null
): Promise<Program | null> {
  if (useMongoBackend()) return mongoUpdateProgram(id, data, tenantId);
  const store = await loadFileStore();
  const idx = store.programs.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  if (tenantId && store.programs[idx].organizationId !== tenantId) return null;
  store.programs[idx] = { ...store.programs[idx], ...data };
  await saveFileStore(store);
  return store.programs[idx];
}

export async function deleteProgram(id: string, tenantId?: string | null): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteProgram(id, tenantId);
  const store = await loadFileStore();
  const idx = store.programs.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  if (tenantId && store.programs[idx].organizationId !== tenantId) return false;
  store.programs.splice(idx, 1);
  const projectIds = store.projects.filter((p) => p.programId === id).map((p) => p.id);
  store.projects = store.projects.filter((p) => p.programId !== id);
  store.indicators = store.indicators.filter(
    (i) => i.programId !== id && (!i.projectId || !projectIds.includes(i.projectId))
  );
  store.budgetLines = store.budgetLines.filter((b) => !projectIds.includes(b.projectId));
  store.risks = store.risks.filter((r) => !projectIds.includes(r.projectId));
  await saveFileStore(store);
  return true;
}

export async function getIndicators(filters?: {
  projectId?: string;
  programId?: string;
  tenantId?: string | null;
}): Promise<Indicator[]> {
  if (useMongoBackend()) return mongoGetIndicators(filters);
  const store = await loadFileStore();
  let list = scoped(store.indicators, filters?.tenantId);
  if (filters?.projectId) list = list.filter((i) => i.projectId === filters.projectId);
  if (filters?.programId) list = list.filter((i) => i.programId === filters.programId);
  return list;
}

export async function createIndicator(data: Omit<Indicator, "id">): Promise<Indicator> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (useMongoBackend()) return mongoCreateIndicator(data);
  const store = await loadFileStore();
  const id = `ind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const raw: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>), id };
  if (raw.projectId == null) delete raw.projectId;
  if (raw.programId == null) delete raw.programId;
  const indicator = raw as unknown as Indicator;
  store.indicators.push(indicator);
  await saveFileStore(store);
  return indicator;
}

export async function updateIndicator(
  id: string,
  data: Partial<Indicator>,
  tenantId?: string | null
): Promise<Indicator | null> {
  if (useMongoBackend()) return mongoUpdateIndicator(id, data, tenantId);
  const store = await loadFileStore();
  const idx = store.indicators.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  if (tenantId && store.indicators[idx].organizationId !== tenantId) return null;
  const merged: Record<string, unknown> = { ...store.indicators[idx] };
  const patch = data as Record<string, unknown>;
  for (const [key, val] of Object.entries(patch)) {
    if (val === null) delete merged[key];
    else merged[key] = val;
  }
  store.indicators[idx] = merged as unknown as Indicator;
  await saveFileStore(store);
  return store.indicators[idx];
}

export async function deleteIndicator(id: string, tenantId?: string | null): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteIndicator(id, tenantId);
  const store = await loadFileStore();
  const idx = store.indicators.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  if (tenantId && store.indicators[idx].organizationId !== tenantId) return false;
  store.indicators.splice(idx, 1);
  await saveFileStore(store);
  return true;
}

export async function getOrganizations(): Promise<Organization[]> {
  if (useMongoBackend()) return mongoGetOrganizations();
  const store = await loadFileStore();
  return store.organizations;
}

export async function getOrganization(id: string): Promise<Organization | null> {
  if (useMongoBackend()) return mongoGetOrganization(id);
  const store = await loadFileStore();
  return store.organizations.find((o) => o.id === id) ?? null;
}

export async function createOrganization(data: Omit<Organization, "id">): Promise<Organization> {
  if (!data.country?.trim()) throw new Error("country is required");
  if (useMongoBackend()) return mongoCreateOrganization(data);
  const store = await loadFileStore();
  const id = `org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const org: Organization = { ...data, id };
  store.organizations.push(org);
  await saveFileStore(store);
  return org;
}

export async function updateOrganization(
  id: string,
  data: Partial<Organization>
): Promise<Organization | null> {
  if (useMongoBackend()) return mongoUpdateOrganization(id, data);
  const store = await loadFileStore();
  const idx = store.organizations.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  store.organizations[idx] = { ...store.organizations[idx], ...data };
  await saveFileStore(store);
  return store.organizations[idx];
}

export async function deleteOrganization(
  id: string,
  options?: { cascade?: boolean }
): Promise<{ ok: boolean; reason?: string }> {
  if (useMongoBackend()) return mongoDeleteOrganization(id, options);
  const store = await loadFileStore();
  const idx = store.organizations.findIndex((o) => o.id === id);
  if (idx === -1) return { ok: false, reason: "Not found." };

  const inUse = store.programs.some((p) => p.organizationId === id);
  if (inUse && !options?.cascade) {
    return {
      ok: false,
      reason: "Programs still reference this organization. Delete with cascade to remove all data.",
    };
  }

  if (options?.cascade) {
    store.programs = store.programs.filter((p) => p.organizationId !== id);
    store.projects = store.projects.filter((p) => p.organizationId !== id);
    store.indicators = store.indicators.filter((i) => i.organizationId !== id);
    store.budgetLines = store.budgetLines.filter((b) => b.organizationId !== id);
    store.risks = store.risks.filter((r) => r.organizationId !== id);
  }

  store.organizations.splice(idx, 1);
  await saveFileStore(store);
  return { ok: true };
}

export async function getBudgetLines(filters?: {
  projectId?: string;
  tenantId?: string | null;
}): Promise<BudgetLine[]> {
  if (useMongoBackend()) return mongoGetBudgetLines(filters);
  const store = await loadFileStore();
  let list = scoped(store.budgetLines, filters?.tenantId);
  if (filters?.projectId) list = list.filter((b) => b.projectId === filters.projectId);
  return list;
}

export async function createBudgetLine(data: Omit<BudgetLine, "id">): Promise<BudgetLine> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (useMongoBackend()) return mongoCreateBudgetLine(data);
  const store = await loadFileStore();
  const id = `bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const line: BudgetLine = { ...data, id };
  store.budgetLines.push(line);
  await saveFileStore(store);
  return line;
}

export async function updateBudgetLine(
  id: string,
  data: Partial<BudgetLine>,
  tenantId?: string | null
): Promise<BudgetLine | null> {
  if (useMongoBackend()) return mongoUpdateBudgetLine(id, data, tenantId);
  const store = await loadFileStore();
  const idx = store.budgetLines.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  if (tenantId && store.budgetLines[idx].organizationId !== tenantId) return null;
  store.budgetLines[idx] = { ...store.budgetLines[idx], ...data };
  await saveFileStore(store);
  return store.budgetLines[idx];
}

export async function deleteBudgetLine(id: string, tenantId?: string | null): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteBudgetLine(id, tenantId);
  const store = await loadFileStore();
  const idx = store.budgetLines.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  if (tenantId && store.budgetLines[idx].organizationId !== tenantId) return false;
  store.budgetLines.splice(idx, 1);
  await saveFileStore(store);
  return true;
}

export async function getRisks(filters?: {
  projectId?: string;
  tenantId?: string | null;
}): Promise<RiskItem[]> {
  if (useMongoBackend()) return mongoGetRisks(filters);
  const store = await loadFileStore();
  let list = scoped(store.risks, filters?.tenantId);
  if (filters?.projectId) list = list.filter((r) => r.projectId === filters.projectId);
  return list;
}

export async function createRisk(data: Omit<RiskItem, "id">): Promise<RiskItem> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (useMongoBackend()) return mongoCreateRisk(data);
  const store = await loadFileStore();
  const id = `risk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const risk: RiskItem = { ...data, id };
  store.risks.push(risk);
  await saveFileStore(store);
  return risk;
}

export async function updateRisk(
  id: string,
  data: Partial<RiskItem>,
  tenantId?: string | null
): Promise<RiskItem | null> {
  if (useMongoBackend()) return mongoUpdateRisk(id, data, tenantId);
  const store = await loadFileStore();
  const idx = store.risks.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  if (tenantId && store.risks[idx].organizationId !== tenantId) return null;
  store.risks[idx] = { ...store.risks[idx], ...data };
  await saveFileStore(store);
  return store.risks[idx];
}

export async function deleteRisk(id: string, tenantId?: string | null): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteRisk(id, tenantId);
  const store = await loadFileStore();
  const idx = store.risks.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  if (tenantId && store.risks[idx].organizationId !== tenantId) return false;
  store.risks.splice(idx, 1);
  await saveFileStore(store);
  return true;
}

/** Aggregated tenant view; organizations always full width. Users/sessions omitted. */
export async function getFullStore(tenantId?: string | null): Promise<Omit<DataStore, "users" | "sessions">> {
  if (useMongoBackend()) return mongoGetFullStore(tenantId);
  const store = await loadFileStore();
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

export async function getUserById(id: string): Promise<User | null> {
  if (useMongoBackend()) return mongoGetUserById(id);
  const store = await loadFileStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (useMongoBackend()) return mongoGetUserByEmail(email);
  const store = await loadFileStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  if (!data.organizationId) throw new Error("organizationId is required");
  if (!data.email?.trim()) throw new Error("email is required");
  if (useMongoBackend()) return mongoCreateUser(data);
  const store = await loadFileStore();
  const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const user: User = {
    ...data,
    email: data.email.trim().toLowerCase(),
    id,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await saveFileStore(store);
  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  if (useMongoBackend()) return mongoUpdateUser(id, data);
  const store = await loadFileStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  store.users[idx] = { ...store.users[idx], ...data };
  await saveFileStore(store);
  return store.users[idx];
}

export async function createSession(data: Session): Promise<Session> {
  if (useMongoBackend()) return mongoCreateSession(data);
  const store = await loadFileStore();
  store.sessions.push(data);
  const now = Date.now();
  store.sessions = store.sessions.filter((s) => Date.parse(s.expiresAt) > now);
  await saveFileStore(store);
  return data;
}

export async function getSession(token: string): Promise<Session | null> {
  if (useMongoBackend()) return mongoGetSession(token);
  const store = await loadFileStore();
  return store.sessions.find((s) => s.token === token) ?? null;
}

export async function deleteSession(token: string): Promise<boolean> {
  if (useMongoBackend()) return mongoDeleteSession(token);
  const store = await loadFileStore();
  const idx = store.sessions.findIndex((s) => s.token === token);
  if (idx === -1) return false;
  store.sessions.splice(idx, 1);
  await saveFileStore(store);
  return true;
}
