import { describe, it, expect } from "vitest";
import { roleHome, roleGuardDecision, isRole, isAdmin, adminGuardDecision } from "@/lib/roles";

describe("roleHome", () => {
  it("maps each role to its dashboard", () => {
    expect(roleHome("super_admin")).toBe("/admin");
    expect(roleHome("admin")).toBe("/admin");
    expect(roleHome("student")).toBe("/dashboard/student");
    expect(roleHome("mentor")).toBe("/dashboard/mentor");
    expect(roleHome("employer")).toBe("/dashboard/employer");
  });

  it("falls back to sign-in for missing or unknown roles", () => {
    expect(roleHome(null)).toBe("/auth?mode=signin");
    expect(roleHome(undefined)).toBe("/auth?mode=signin");
    expect(roleHome("wizard")).toBe("/auth?mode=signin");
    expect(roleHome("")).toBe("/auth?mode=signin");
  });
});

describe("roleGuardDecision", () => {
  it("allows a role that is in the allow-list", () => {
    expect(roleGuardDecision("student", ["student"])).toBe("allow");
    expect(roleGuardDecision("admin", ["admin", "employer"])).toBe("allow");
  });

  it("blocks a role that is not in the allow-list", () => {
    expect(roleGuardDecision("student", ["mentor"])).toBe("unauthorized");
    expect(roleGuardDecision("employer", ["student", "mentor"])).toBe("unauthorized");
  });

  it("sends unauthenticated visitors to login", () => {
    expect(roleGuardDecision(null, ["student"])).toBe("login");
    expect(roleGuardDecision(undefined, ["student"])).toBe("login");
    expect(roleGuardDecision("bogus", ["student"])).toBe("login");
  });

  it("super_admin bypasses any role check", () => {
    expect(roleGuardDecision("super_admin", ["student"])).toBe("allow");
    expect(roleGuardDecision("super_admin", [])).toBe("allow");
  });
});

describe("isRole", () => {
  it("recognizes all five valid roles", () => {
    expect(isRole("super_admin")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("student")).toBe(true);
    expect(isRole("mentor")).toBe(true);
    expect(isRole("employer")).toBe(true);
    expect(isRole("ghost")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(123)).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for admin roles", () => {
    expect(isAdmin("super_admin")).toBe(true);
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("student")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("adminGuardDecision", () => {
  it("allows admin and super_admin", () => {
    expect(adminGuardDecision("super_admin")).toBe("allow");
    expect(adminGuardDecision("admin")).toBe("allow");
    expect(adminGuardDecision("student")).toBe("unauthorized");
    expect(adminGuardDecision(null)).toBe("login");
  });
});
