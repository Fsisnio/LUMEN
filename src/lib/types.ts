// CARIPRIP - Collaborative Integrated Program Intelligence Platform
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

/** Paid Lumen plan tier; aligned with `OfferTierId` in subscription-offers. */
export type SubscriptionTierId = "free" | "day_pass" | "week_pass" | "month_pass";

export interface OrganizationSubscription {
  tier: SubscriptionTierId;
  /** ISO 8601; pass is active while this is in the future. */
  paidUntil: string;
}

/** Usage counters enforced against `subscription.tier` + `paidUntil` (subscription-quota). */
export interface OrganizationSubscriptionUsage {
  entitlementSnapshot?: string;
  freeAi?: { period: string; count: number };
  paidAiDay?: { period: string; count: number };
  passAiTotal?: number;
  passReportTotal?: number;
  reportWeek?: { period: string; count: number };
  reportMonth?: { period: string; count: number };
}

export interface Organization {
  id: string;
  name: string;
  type: "National Office" | "Diocesan Branch" | "Regional Coordination";
  /** ISO country name in English. Each organization is scoped to a single country. */
  country: string;
  region?: string;
  diocese?: string;
  /** Optional — set after PayDunya fulfills a pass purchase. */
  subscription?: OrganizationSubscription;
  /** Percent discount (0–100) applied to the next paid checkout after a Month pass. */
  nextRenewalDiscountPct?: number;
  /** Invoice tokens already fulfilled (idempotent IPN / return verification). */
  paydunyaCompletedTokens?: string[];
  /** AI / automated report quotas. */
  subscriptionUsage?: OrganizationSubscriptionUsage;
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
  /** Platform-wide superadmin (manages all orgs/users from the /admin console). */
  isSuperadmin?: boolean;
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
