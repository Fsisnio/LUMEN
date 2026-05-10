import type { UserRole } from "./types";

/** Organizational administrator — can invite members into the same tenant. */
export const ORG_ADMIN_ROLE: UserRole = "Executive Director";

export function isOrganizationAdministrator(role: UserRole): boolean {
  return role === ORG_ADMIN_ROLE;
}

/** Roles the org admin may assign when creating a member account (never includes Executive Director). */
export const MEMBER_INVITABLE_ROLES: UserRole[] = [
  "Program Manager",
  "Project Manager",
  "Finance Officer",
  "M&E Officer",
  "Partner/Diocese",
];

export function isInvitableMemberRole(role: unknown): role is UserRole {
  return typeof role === "string" && MEMBER_INVITABLE_ROLES.includes(role as UserRole);
}
