"use client";

/**
 * MascotEngine — the single source of truth for what Atlas is feeling,
 * what it's saying, and where it's pointing.
 *
 * Any component can raise an event:
 *
 *   const { emit } = useMascot();
 *   emit("SCAM_WARNING", { score: 92 });
 *
 * The engine decides the emotion, mode, dialogue and lifetime. Components
 * never set the emotion directly — that keeps Atlas's behaviour consistent
 * across the whole app instead of drifting per-page.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { resolveMessage } from "./dialogue";
import { shouldSpeak } from "./policy";
import {
  EVENT_TABLE, IDLE_STATE, PRIORITY,
  type MascotCta, type MascotEvent, type MascotParams, type MascotState,
} from "./types";

/** What the user is trying to do — lets Atlas stop asking what it already knows (§23). */
export type JourneyContext = {
  destination: string | null;
  goal: string | null;
  progress: number | null;
};

type EmitOptions = {
  /** Override the event's default call-to-action. */
  cta?: MascotCta;
  /** Override the auto-dismiss time (ms). 0 pins it until replaced or dismissed. */
  ttl?: number;
  /**
   * Bypass the anti-fatigue rules (cooldown + dismissal memory). Only for
   * things the user explicitly triggered — e.g. re-running a scam check —
   * never for automatic chatter.
   */
  force?: boolean;
};

type MascotContextValue = MascotState & {
  emit: (event: MascotEvent, params?: MascotParams, options?: EmitOptions) => void;
  dismiss: () => void;
  journey: JourneyContext;
  setJourney: (patch: Partial<JourneyContext>) => void;
  /** True once mounted on the client — guards SSR/hydration-sensitive rendering. */
  ready: boolean;
};

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<MascotState>(IDLE_STATE);
  const [journey, setJourneyState] = useState<JourneyContext>({
    destination: null, goal: null, progress: null,
  });
  const [ready, setReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors state.priority without making `emit` depend on it — otherwise every
  // emit would be a new function identity and re-fire caller effects.
  const priorityRef = useRef<number>(PRIORITY.ambient);

  // ── Anti-fatigue bookkeeping (docs/MASCOT.md Part 25) ──────────────────
  // The measure of success is that users are mildly *pleased* when Atlas
  // speaks, because it means something actually happened.
  const lastSpokeAtRef = useRef<number>(0);
  /** Events the user has explicitly dismissed — they don't come back this session. */
  const dismissedRef = useRef<Set<MascotEvent>>(new Set());
  /** Consecutive dismissals. Each one buys the user more quiet. */
  const dismissStreakRef = useRef<number>(0);
  /** Mirrors state.event so `dismiss` can read it without a stateful side effect. */
  const currentEventRef = useRef<MascotEvent | null>(null);

  useEffect(() => {
    setReady(true);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    // Dismissal is a signal, not just a close. Remember it and read the room.
    // Done via refs rather than inside a setState updater, because React may
    // invoke an updater twice (StrictMode) and double-count the streak.
    if (currentEventRef.current) {
      dismissedRef.current.add(currentEventRef.current);
      dismissStreakRef.current += 1;
    }
    currentEventRef.current = null;
    priorityRef.current = PRIORITY.ambient;
    lastSpokeAtRef.current = Date.now();
    setState(IDLE_STATE);
  }, [clearTimer]);

  const emit = useCallback(
    (event: MascotEvent, params?: MascotParams, options?: EmitOptions) => {
      const spec = EVENT_TABLE[event];
      if (!spec) return;


      // Priority + anti-fatigue rules live in policy.ts as a pure function, so
      // they're unit-tested independently of React (see policy.test.ts).
      const decision = shouldSpeak({
        event,
        priority: spec.priority,
        activePriority: priorityRef.current,
        lastSpokeAt: lastSpokeAtRef.current,
        dismissed: dismissedRef.current,
        dismissStreak: dismissStreakRef.current,
        now: Date.now(),
        force: options?.force,
      });
      if (!decision.allow) return;

      if (spec.priority > PRIORITY.notable) {
        // Something genuinely important surfaced, so the relationship resets —
        // don't keep penalising the user for having dismissed earlier chatter.
        dismissStreakRef.current = 0;
      }

      clearTimer();
      priorityRef.current = spec.priority;
      lastSpokeAtRef.current = Date.now();
      currentEventRef.current = event;

      setState({
        emotion: spec.emotion,
        mode: spec.mode,
        event,
        message: resolveMessage(event, params, t),
        cta: options?.cta ?? spec.cta ?? null,
        priority: spec.priority,
      });

      const ttl = options?.ttl ?? spec.ttl;
      if (ttl > 0) {
        timerRef.current = setTimeout(() => {
          priorityRef.current = PRIORITY.ambient;
          setState(IDLE_STATE);
        }, ttl);
      }
    },
    [clearTimer, t],
  );

  const setJourney = useCallback((patch: Partial<JourneyContext>) => {
    setJourneyState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<MascotContextValue>(
    () => ({ ...state, emit, dismiss, journey, setJourney, ready }),
    [state, emit, dismiss, journey, setJourney, ready],
  );

  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
}

/**
 * Access the mascot engine.
 *
 * Returns a no-op shim when used outside the provider so that dropping a
 * component into a tree without MascotProvider degrades silently instead of
 * crashing the page.
 */
export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (ctx) return ctx;
  return {
    ...IDLE_STATE,
    emit: () => {},
    dismiss: () => {},
    journey: { destination: null, goal: null, progress: null },
    setJourney: () => {},
    ready: false,
  };
}
