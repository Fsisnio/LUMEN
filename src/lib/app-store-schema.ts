import type { Organization, Program, Project, Indicator, BudgetLine, RiskItem, User, Session } from "./types";
import {
  organizations as defaultOrgs,
  programs as defaultPrograms,
  projects as defaultProjects,
  indicators as defaultIndicators,
  budgetLines as defaultBudgetLines,
  risks as defaultRisks,
} from "./mock-data";
import { hashPassword, verifyPassword } from "./password-crypto";

export interface DataStore {
  organizations: Organization[];
  programs: Program[];
  projects: Project[];
  indicators: Indicator[];
  budgetLines: BudgetLine[];
  risks: RiskItem[];
  users: User[];
  sessions: Session[];
}

export function seedHash(plain: string): string {
  return hashPassword(plain);
}

export function getDefaultStore(): DataStore {
  return {
    organizations: [...defaultOrgs],
    programs: [...defaultPrograms],
    projects: [...defaultProjects],
    indicators: [...defaultIndicators],
    budgetLines: [...defaultBudgetLines],
    risks: [...defaultRisks],
    users: [],
    sessions: [],
  };
}

export const DEMO_ADMINS: { email: string; name: string; password: string; orgId: string }[] = [
  { email: "admin@collaborative-senegal.org", name: "Demo Admin (Sénégal)", password: "collaborative123", orgId: "org-1" },
  { email: "admin@collaborative-mali.org", name: "Demo Admin (Mali)", password: "collaborative123", orgId: "org-5" },
  { email: "admin@collaborative-bf.org", name: "Demo Admin (Burkina Faso)", password: "collaborative123", orgId: "org-6" },
];

/**
 * Ensure the three canonical demo admins match current `DEMO_ADMINS`
 * (fixes legacy @caritas-* emails and hashes after renames / password changes).
 */
export function syncDemoAdminUsersInPlace(store: DataStore): boolean {
  let changed = false;
  const orgIds = new Set(store.organizations.map((o) => o.id));

  for (const demo of DEMO_ADMINS) {
    if (!orgIds.has(demo.orgId)) continue;
    const canonicalId = `usr-${demo.orgId}`;
    const legacyEmail = demo.email.replace("collaborative", "caritas").toLowerCase();
    const demoEmail = demo.email.toLowerCase();

    let u =
      store.users.find((x) => x.id === canonicalId) ??
      store.users.find((x) => {
        const e = x.email.toLowerCase();
        return e === demoEmail || e === legacyEmail;
      });

    if (!u) continue;

    if (u.id !== canonicalId) {
      store.users = store.users.filter((x) => x.id !== canonicalId || x === u);
      u.id = canonicalId;
      changed = true;
    }

    const emailOk = u.email.toLowerCase() === demoEmail;
    const passOk = verifyPassword(demo.password, u.passwordHash);
    const orgOk = u.organizationId === demo.orgId;

    if (!emailOk || !passOk || !orgOk) {
      u.email = demo.email;
      u.passwordHash = hashPassword(demo.password);
      u.organizationId = demo.orgId;
      changed = true;
    }
  }

  return changed;
}

/**
 * Backfill `organizationId` and `country` on legacy stores. Idempotent.
 */
export function migrateStoreInPlace(store: DataStore): { changed: boolean } {
  let changed = false;

  for (const org of store.organizations) {
    if (typeof org.country !== "string" || org.country.trim() === "") {
      org.country = "Senegal";
      changed = true;
    }
  }

  for (const program of store.programs) {
    if (!program.organizationId) {
      program.organizationId = store.organizations[0]?.id ?? "org-1";
      changed = true;
    }
  }

  const programOrg = new Map(store.programs.map((p) => [p.id, p.organizationId]));

  for (const project of store.projects) {
    if (!project.organizationId) {
      project.organizationId = programOrg.get(project.programId) ?? store.organizations[0]?.id ?? "org-1";
      changed = true;
    }
  }

  const projectOrg = new Map(store.projects.map((p) => [p.id, p.organizationId]));

  for (const ind of store.indicators) {
    if (!ind.organizationId) {
      const fromProject = ind.projectId ? projectOrg.get(ind.projectId) : undefined;
      const fromProgram = ind.programId ? programOrg.get(ind.programId) : undefined;
      ind.organizationId = fromProject ?? fromProgram ?? store.organizations[0]?.id ?? "org-1";
      changed = true;
    }
  }

  for (const bl of store.budgetLines) {
    if (!bl.organizationId) {
      bl.organizationId = projectOrg.get(bl.projectId) ?? store.organizations[0]?.id ?? "org-1";
      changed = true;
    }
  }

  for (const risk of store.risks) {
    if (!risk.organizationId) {
      risk.organizationId = projectOrg.get(risk.projectId) ?? store.organizations[0]?.id ?? "org-1";
      changed = true;
    }
  }

  if (!Array.isArray(store.users)) {
    store.users = [];
    changed = true;
  }
  if (!Array.isArray(store.sessions)) {
    store.sessions = [];
    changed = true;
  }

  if (store.users.length === 0) {
    const orgIds = new Set(store.organizations.map((o) => o.id));
    for (const admin of DEMO_ADMINS) {
      if (!orgIds.has(admin.orgId)) continue;
      store.users.push({
        id: `usr-${admin.orgId}`,
        email: admin.email,
        name: admin.name,
        organizationId: admin.orgId,
        role: "Executive Director",
        passwordHash: seedHash(admin.password),
        createdAt: new Date().toISOString(),
      });
      changed = true;
    }
  }

  if (syncDemoAdminUsersInPlace(store)) {
    changed = true;
  }

  return { changed };
}
