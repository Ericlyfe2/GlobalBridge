import { describe, it, expect } from "vitest";
import { roleHome, roleGuardDecision, isRole } from "@/lib/roles";

describe("roleHome", () => {
  it("maps each role to its dashboard", () => {
    expect(roleHome("student")).toBe("/dashboard/student");
    expect(roleHome("mentor")).toBe("/dashboard/mentor");
    expect(roleHome("employer")).toBe("/dashboard/employer");
    expect(roleHome("admin")).toBe("/admin");
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
});

describe("isRole", () => {
  it("recognizes valid roles only", () => {
    expect(isRole("student")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("ghost")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(123)).toBe(false);
  });
});
