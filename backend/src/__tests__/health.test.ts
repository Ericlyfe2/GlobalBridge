import { describe, it, expect } from "vitest";
import { measure } from "../lib/health";

describe("measure", () => {
  it("returns 'up' with a non-negative latency on success", async () => {
    const p = await measure("svc", async () => {});
    expect(p.name).toBe("svc");
    expect(p.status).toBe("up");
    expect(p.latencyMs).toBeGreaterThanOrEqual(0);
    expect(p.detail).toBeUndefined();
  });

  it("returns 'down' with the error message on throw", async () => {
    const p = await measure("svc", async () => {
      throw new Error("boom");
    });
    expect(p.status).toBe("down");
    expect(p.detail).toBe("boom");
  });
});

// The probeAI tests that lived here are gone with the probe itself (GB-09).
// It targeted AI_SERVICE_URL, the removed Python microservice, so it reported
// down unconditionally; the AI features are Next.js route handlers in a
// separate deployment, not a dependency of this process. Coverage of what
// readiness now checks lives in operability.test.ts.
