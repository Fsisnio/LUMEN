// CARIPRIP - Caritas Integrated Program Intelligence Platform
// Hierarchy: Organization → Programs → Projects

export type ProgramTheme =
  | "Food Security"
  | "Health & Nutrition"
  | "Education"
  | "Livelihoods"
  | "Emergency Response"
  | "Social Protection"
  | "Climate Resilience";

export type UserRole =
  | "Executive Director"
  | "Program Manager"
  | "Project Manager"
  | "Finance Officer"
  | "M&E Officer"
  | "Partner/Diocese";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Organization {
  id: string;
  name: string;
  type: "National Office" | "Diocesan Branch" | "Regional Coordination";
  /** ISO country name in English. Each organization is scoped to a single country. */
  country: string;
  region?: string;
  diocese?: string;
}

export interface Program {
  id: string;
  name: ProgramTheme;
  organizationId: string;
  description?: string;
  totalBudget: number;
  spentBudget: number;
  activeProjects: number;
  riskLevel: RiskLevel;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  /** Tenant scope (= owning organization). */
  organizationId: string;
  programId: string;
  donor: string;
  budget: number;
  spent: number;
  duration: { start: string; end: string };
  location: string;
  region: string;
  manager: string;
  progress: number;
  beneficiaries: number;
  status: "active" | "completed" | "delayed" | "planning";
  riskLevel: RiskLevel;
  lat?: number;
  lng?: number;
  /** Free text: proposal / contract / report references or URLs */
  documentNotes?: string;
}

export interface Indicator {
  id: string;
  /** Tenant scope (= owning organization). */
  organizationId: string;
  projectId?: string;
  programId?: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  disaggregation?: { gender?: Record<string, number>; age?: Record<string, number> };
}

export interface BudgetLine {
  id: string;
  /** Tenant scope (= owning organization). */
  organizationId: string;
  projectId: string;
  category: string;
  budgeted: number;
  spent: number;
}

export interface RiskItem {
  id: string;
  /** Tenant scope (= owning organization). */
  organizationId: string;
  projectId: string;
  description: string;
  level: RiskLevel;
  mitigation?: string;
  status: "open" | "mitigated" | "closed";
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: UserRole;
  /** Salted scrypt hash, format `salt:hash`. */
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  /** Random opaque token stored in the session cookie. */
  token: string;
  userId: string;
  organizationId: string;
  /** ISO timestamp. */
  expiresAt: string;
  createdAt: string;
}

/**
 * Public user shape (never includes the password hash). Used by /api/auth/me
 * and the AuthContext.
 */
export type PublicUser = Omit<User, "passwordHash">;
