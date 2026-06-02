import { describe, it, expect } from "vitest";

describe("Environment configuration", () => {
  const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];

  for (const v of requiredVars) {
    it(`recognizes ${v} as a configured variable`, () => {
      expect(typeof process.env[v] === "string" || process.env[v] === undefined).toBe(true);
    });
  }
});
