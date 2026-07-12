import { describe, it, expect } from "vitest";
import { measure, probeAI } from "../lib/health";

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

describe("probeAI", () => {
  it("is 'up' when the AI service returns ok", async () => {
    const fakeFetch = (async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
    const p = await probeAI(fakeFetch);
    expect(p.status).toBe("up");
  });

  it("is 'down' when the AI service returns a non-2xx", async () => {
    const fakeFetch = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    const p = await probeAI(fakeFetch);
    expect(p.status).toBe("down");
    expect(p.detail).toContain("503");
  });

  it("is 'down' when the fetch itself rejects", async () => {
    const fakeFetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const p = await probeAI(fakeFetch);
    expect(p.status).toBe("down");
    expect(p.detail).toContain("ECONNREFUSED");
  });
});
