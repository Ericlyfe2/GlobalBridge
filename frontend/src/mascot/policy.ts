/**
 * Should Atlas speak?
 *
 * This is the whole "don't be annoying" decision, kept as a pure function so it
 * can be reasoned about and tested without React. The provider owns the state;
 * this owns the rules (docs/MASCOT.md Parts 24–25).
 *
 * Two independent gates, in order:
 *   1. Priority  — a routine event can never bury an active warning.
 *   2. Fatigue   — routine events respect dismissal memory and a cooldown that
 *                  grows the more the user dismisses.
 *
 * Warnings and critical alerts are exempt from gate 2 entirely: safety must
 * always land.
 */

import { PRIORITY, type MascotEvent, type MascotPriority } from "./types";

/** Base quiet period between routine messages. */
export const COOLDOWN_MS = 45_000;
/** Extra quiet bought by each consecutive dismissal. */
export const DISMISS_PENALTY_MS = 30_000;
/** Ceiling, so a user who dismisses a lot isn't silenced forever. */
export const MAX_COOLDOWN_MS = 5 * 60_000;

export type SpeakDecision =
  | { allow: true }
  | { allow: false; reason: "lower-priority" | "dismissed" | "cooldown" };

export type SpeakInput = {
  event: MascotEvent;
  priority: MascotPriority;
  /** Priority of whatever is currently on screen. */
  activePriority: number;
  /** Timestamp of the last message Atlas actually showed. */
  lastSpokeAt: number;
  /** Events the user has explicitly closed this session. */
  dismissed: ReadonlySet<MascotEvent>;
  /** Consecutive dismissals. */
  dismissStreak: number;
  now: number;
  /** User explicitly asked for this — bypasses fatigue rules only. */
  force?: boolean;
};

/** Quiet period for the current dismissal streak. */
export function cooldownFor(dismissStreak: number): number {
  return Math.min(
    COOLDOWN_MS + dismissStreak * DISMISS_PENALTY_MS,
    MAX_COOLDOWN_MS,
  );
}

export function shouldSpeak(input: SpeakInput): SpeakDecision {
  const { event, priority, activePriority, lastSpokeAt, dismissed, dismissStreak, now, force } = input;

  // ── Gate 1: priority ────────────────────────────────────────────────
  // Never interrupt something more important. This is the rule that stops
  // "I found 3 jobs" from replacing a scam warning.
  if (priority < activePriority) {
    return { allow: false, reason: "lower-priority" };
  }

  // Warnings and above skip the fatigue rules — they must always land.
  const isRoutine = priority <= PRIORITY.notable;
  if (!isRoutine || force) return { allow: true };

  // ── Gate 2: fatigue ─────────────────────────────────────────────────
  // The user already closed this one. Don't bring it back this session.
  if (dismissed.has(event)) {
    return { allow: false, reason: "dismissed" };
  }

  // Only routine chatter is rate-limited; successes/milestones are rare
  // enough to always be worth showing.
  if (priority <= PRIORITY.info && now - lastSpokeAt < cooldownFor(dismissStreak)) {
    return { allow: false, reason: "cooldown" };
  }

  return { allow: true };
}
