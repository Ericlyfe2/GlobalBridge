import { describe, it, expect } from "vitest";
import {
  shouldSpeak, cooldownFor,
  COOLDOWN_MS, DISMISS_PENALTY_MS, MAX_COOLDOWN_MS,
} from "@/mascot/policy";
import { PRIORITY, EVENT_TABLE, type MascotEvent } from "@/mascot/types";

const NOW = 1_000_000;

/** Sensible defaults: nothing on screen, nothing dismissed, long past cooldown. */
function input(over: Partial<Parameters<typeof shouldSpeak>[0]> = {}) {
  return {
    event: "JOB_MATCH_FOUND" as MascotEvent,
    priority: PRIORITY.info,
    activePriority: PRIORITY.ambient,
    lastSpokeAt: 0,
    dismissed: new Set<MascotEvent>(),
    dismissStreak: 0,
    now: NOW,
    ...over,
  };
}

describe("priority guard", () => {
  it("lets an event through when nothing more important is showing", () => {
    expect(shouldSpeak(input()).allow).toBe(true);
  });

  it("blocks a routine event while a scam warning is on screen", () => {
    // The rule the whole system exists for: safety must not be buried.
    const d = shouldSpeak(input({
      event: "JOB_MATCH_FOUND",
      priority: PRIORITY.info,
      activePriority: PRIORITY.critical,
    }));
    expect(d).toEqual({ allow: false, reason: "lower-priority" });
  });

  it("lets a critical alert interrupt routine chatter", () => {
    expect(shouldSpeak(input({
      event: "SCAM_WARNING",
      priority: PRIORITY.critical,
      activePriority: PRIORITY.info,
    })).allow).toBe(true);
  });

  it("allows an equal-priority event to replace the current one", () => {
    expect(shouldSpeak(input({
      priority: PRIORITY.info,
      activePriority: PRIORITY.info,
      lastSpokeAt: 0,
    })).allow).toBe(true);
  });
});

describe("cooldown", () => {
  it("suppresses routine chatter inside the quiet window", () => {
    const d = shouldSpeak(input({ lastSpokeAt: NOW - (COOLDOWN_MS - 1) }));
    expect(d).toEqual({ allow: false, reason: "cooldown" });
  });

  it("allows routine chatter once the window has passed", () => {
    expect(shouldSpeak(input({ lastSpokeAt: NOW - (COOLDOWN_MS + 1) })).allow).toBe(true);
  });

  it("does not rate-limit successes and milestones", () => {
    // Milestones are rare; they should never be swallowed by a cooldown.
    expect(shouldSpeak(input({
      event: "MILESTONE_REACHED",
      priority: PRIORITY.notable,
      lastSpokeAt: NOW - 1,
    })).allow).toBe(true);
  });

  it("never rate-limits warnings or critical alerts", () => {
    for (const p of [PRIORITY.warning, PRIORITY.critical]) {
      expect(shouldSpeak(input({
        event: "SCAM_WARNING", priority: p, lastSpokeAt: NOW - 1,
      })).allow).toBe(true);
    }
  });
});

describe("dismissal memory", () => {
  it("does not bring back an event the user closed", () => {
    const d = shouldSpeak(input({
      dismissed: new Set<MascotEvent>(["JOB_MATCH_FOUND"]),
      lastSpokeAt: 0,
    }));
    expect(d).toEqual({ allow: false, reason: "dismissed" });
  });

  it("still shows a scam warning even if it was dismissed before", () => {
    // Safety overrides the user's earlier dismissal — the risk is still real.
    expect(shouldSpeak(input({
      event: "SCAM_WARNING",
      priority: PRIORITY.critical,
      dismissed: new Set<MascotEvent>(["SCAM_WARNING"]),
    })).allow).toBe(true);
  });

  it("lets `force` bypass dismissal for a user-triggered action", () => {
    expect(shouldSpeak(input({
      dismissed: new Set<MascotEvent>(["JOB_MATCH_FOUND"]),
      force: true,
    })).allow).toBe(true);
  });

  it("`force` cannot override the priority guard", () => {
    // Forcing is about fatigue, never about jumping the safety queue.
    expect(shouldSpeak(input({
      priority: PRIORITY.info,
      activePriority: PRIORITY.critical,
      force: true,
    })).allow).toBe(false);
  });
});

describe("escalating quiet", () => {
  it("lengthens the cooldown with each consecutive dismissal", () => {
    expect(cooldownFor(0)).toBe(COOLDOWN_MS);
    expect(cooldownFor(1)).toBe(COOLDOWN_MS + DISMISS_PENALTY_MS);
    expect(cooldownFor(2)).toBe(COOLDOWN_MS + 2 * DISMISS_PENALTY_MS);
  });

  it("caps the quiet period so Atlas is never silenced forever", () => {
    expect(cooldownFor(999)).toBe(MAX_COOLDOWN_MS);
  });

  it("applies the longer window after dismissals", () => {
    // Gap that would be fine at streak 0 but not at streak 2.
    const gap = COOLDOWN_MS + 1;
    expect(shouldSpeak(input({ lastSpokeAt: NOW - gap, dismissStreak: 0 })).allow).toBe(true);
    expect(shouldSpeak(input({ lastSpokeAt: NOW - gap, dismissStreak: 2 })).allow).toBe(false);
  });
});

describe("event table integrity", () => {
  it("pins every warning and critical event so it cannot silently expire", () => {
    for (const [event, spec] of Object.entries(EVENT_TABLE)) {
      if (spec.priority >= PRIORITY.warning) {
        expect(spec.ttl, `${event} must stay until dismissed`).toBe(0);
      }
    }
  });

  it("gives every auto-dismissing event enough time to be read", () => {
    for (const [event, spec] of Object.entries(EVENT_TABLE)) {
      if (spec.ttl > 0) {
        expect(spec.ttl, `${event} disappears too fast`).toBeGreaterThanOrEqual(4000);
      }
    }
  });

  it("routes safety events to guardian mode", () => {
    for (const e of ["SCAM_WARNING", "SUSPICIOUS_LISTING", "EMERGENCY_MODE"] as const) {
      expect(EVENT_TABLE[e].mode).toBe("guardian");
    }
  });
});
