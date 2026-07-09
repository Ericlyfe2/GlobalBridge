import { describe, it, expect, vi, beforeEach } from "vitest";

const query = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
}));

import { recordAudit, clampLimit } from "../lib/audit";

describe("recordAudit", () => {
  beforeEach(() => query.mockReset());

  it("inserts with normalized null defaults for optional fields", async () => {
    query.mockResolvedValueOnce([]);
    await recordAudit({ adminId: "admin-1", action: "user.verify" });
    expect(query).toHaveBeenCalledOnce();
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe("admin-1");
    expect(params[1]).toBe("user.verify");
    expect(params[2]).toBeNull(); // target_type
    expect(params[3]).toBeNull(); // target_id
    expect(params[4]).toBe("{}"); // metadata serialized
  });

  it("serializes metadata to JSON", async () => {
    query.mockResolvedValueOnce([]);
    await recordAudit({ adminId: "a", action: "report.resolve", targetType: "report", targetId: "r1", metadata: { status: "resolved" } });
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe("report");
    expect(params[3]).toBe("r1");
    expect(JSON.parse(params[4] as string)).toEqual({ status: "resolved" });
  });

  it("never throws even if the DB write fails", async () => {
    query.mockRejectedValueOnce(new Error("db down"));
    await expect(recordAudit({ adminId: "a", action: "x" })).resolves.toBeUndefined();
  });
});

describe("clampLimit", () => {
  it("falls back on non-numeric input", () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit("nope")).toBe(50);
  });
  it("clamps to range", () => {
    expect(clampLimit("0")).toBe(1);
    expect(clampLimit("9999")).toBe(100);
    expect(clampLimit("25")).toBe(25);
  });
});
