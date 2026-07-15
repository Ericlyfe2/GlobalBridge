// Central role → routing logic. Pure functions so they can be unit-tested
// without a router or the DOM. Used by login/signup redirects, RoleGuard,
// the /dashboard index redirect, and the /unauthorized page.

export type Role = "super_admin" | "admin" | "student" | "mentor" | "employer";

const SIGN_IN = "/auth?mode=signin";

// Where each role lands after authenticating.
const ROLE_HOME: Record<string, string> = {
  super_admin: "/admin",
  admin: "/admin",
  student: "/dashboard/student",
  mentor: "/dashboard/mentor",
  employer: "/dashboard/employer",
};

export function isRole(value: unknown): value is Role {
  return value === "super_admin" || value === "admin" || value === "student" || value === "mentor" || value === "employer";
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
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
  if (role === "super_admin") return "allow";
  return allow.includes(role) ? "allow" : "unauthorized";
}

export function adminGuardDecision(role: string | null | undefined): GuardDecision {
  return roleGuardDecision(role, ["admin", "super_admin"]);
}
