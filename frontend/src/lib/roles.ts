// Central role → routing logic. Pure functions so they can be unit-tested
// without a router or the DOM. Used by login/signup redirects, RoleGuard,
// the /dashboard index redirect, and the /unauthorized page.

export type Role = "student" | "mentor" | "employer" | "admin";

const SIGN_IN = "/auth?mode=signin";

// Where each role lands after authenticating. Admin keeps its existing
// /admin/* section; /dashboard/admin redirects there for spec consistency.
const ROLE_HOME: Record<Role, string> = {
  student: "/dashboard/student",
  mentor: "/dashboard/mentor",
  employer: "/dashboard/employer",
  admin: "/admin",
};

export function isRole(value: unknown): value is Role {
  return value === "student" || value === "mentor" || value === "employer" || value === "admin";
}

/** The home route for a role. Unknown / missing role → the sign-in page. */
export function roleHome(role: string | null | undefined): string {
  return isRole(role) ? ROLE_HOME[role] : SIGN_IN;
}

export type GuardDecision = "allow" | "unauthorized" | "login";

/**
 * Pure access decision for a route that only permits `allow` roles.
 * - no role            → "login"      (send to sign-in)
 * - role in allow-list → "allow"
 * - role not allowed   → "unauthorized"
 */
export function roleGuardDecision(role: string | null | undefined, allow: Role[]): GuardDecision {
  if (!isRole(role)) return "login";
  return allow.includes(role) ? "allow" : "unauthorized";
}
