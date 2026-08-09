/**
 * Atlas — the GlobalBridge mascot engine.
 *
 * Atlas is a *navigator*, not a chatbot with a face. Every visual state is
 * derived from a real application event, so the mascot always means something.
 * See MASCOT.md for the full personality contract.
 */

/** Face-screen expressions. The robot's screen is the emotional system. */
export type MascotEmotion =
  | "idle"
  | "happy"
  | "excited"
  | "thinking"
  | "scanning"
  | "concerned"
  | "alert"
  | "celebrating"
  | "proud"
  | "confused"
  | "serious"
  | "surprised" // canonical sheet — reserved for genuinely rare finds
  | "winking";  // canonical sheet — small wins, light moments only

/** Behavioural register — governs tone, animation energy and accent colour. */
export type MascotMode =
  | "companion"   // dashboard: friendly + calm
  | "navigator"   // visa/journey: intelligent + focused
  | "discoverer"  // jobs/scholarships/housing: excited + curious
  | "guardian"    // scams/verification/safety: protective + serious
  | "celebrator"; // milestones: energetic

/** Every event the app can raise. Grouped exactly as the spec's event tree. */
export type MascotEvent =
  // AUTH
  | "USER_WELCOME"
  | "LOGIN_RETURN"
  | "PROFILE_COMPLETED"
  // ONBOARDING
  | "DESTINATION_SELECTED"
  | "GOAL_SELECTED"
  | "ONBOARDING_COMPLETED"
  // VISA
  | "VISA_STARTED"
  | "CHECKLIST_CREATED"
  | "CHECKLIST_ITEM_COMPLETED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_SCANNING"
  | "DOCUMENT_VALID"
  | "DOCUMENT_WARNING"
  | "VISA_PROGRESS_UPDATED"
  // HOUSING
  | "HOUSING_SEARCH"
  | "VERIFIED_LISTING"
  | "SAVED_HOUSING"
  | "SUSPICIOUS_LISTING"
  // JOBS
  | "JOB_MATCH_FOUND"
  | "SPONSORSHIP_MATCH"
  | "JOB_SAVED"
  | "APPLICATION_SUBMITTED"
  // OPPORTUNITIES
  | "SCHOLARSHIP_FOUND"
  | "OPPORTUNITY_MATCH"
  | "DEADLINE_APPROACHING"
  // MENTORSHIP
  | "MENTOR_MATCHED"
  | "MENTOR_BOOKED"
  | "MENTOR_MESSAGE"
  // COMMUNITY
  | "FIRST_POST"
  | "ANSWER_RECEIVED"
  | "COMMUNITY_CONTRIBUTION"
  // PROGRESS
  | "GOAL_COMPLETED"
  | "MILESTONE_REACHED"
  | "JOURNEY_STAGE_COMPLETED"
  // SAFETY
  | "SCAM_WARNING"
  | "VERIFICATION_REQUIRED"
  | "EMERGENCY_MODE"
  // SYSTEM
  | "THINKING"
  | "ERROR"
  | "SUCCESS"
  | "IDLE_REMINDER";

/** Values interpolated into dialogue, e.g. "I found {count} jobs". */
export type MascotParams = Record<string, string | number>;

export type MascotCta = { label: string; href: string };

/**
 * Priority guards the "don't appear after every action" rule (spec §27):
 * a lower-priority event can never interrupt a higher-priority one while it
 * is still on screen. Safety always wins.
 */
export const PRIORITY = {
  ambient: 0,   // idle chatter, traversal
  info: 1,      // discoveries, progress
  // Always shown (never rate-limited) but still auto-dismisses. Covers both
  // milestones and transient system errors — the tier is about interrupt
  // authority, not about whether the news is good.
  notable: 2,
  warning: 3,   // document issues, deadlines
  critical: 4,  // scams, emergencies
} as const;

export type MascotPriority = (typeof PRIORITY)[keyof typeof PRIORITY];

export type MascotState = {
  emotion: MascotEmotion;
  mode: MascotMode;
  event: MascotEvent | null;
  message: string | null;
  cta: MascotCta | null;
  priority: MascotPriority;
};

/** Static behaviour table: event → how Atlas reacts. */
type EventSpec = {
  emotion: MascotEmotion;
  mode: MascotMode;
  priority: MascotPriority;
  /** ms before Atlas relaxes back to idle. 0 = stays until replaced/dismissed. */
  ttl: number;
  cta?: MascotCta;
};

const S = (
  emotion: MascotEmotion,
  mode: MascotMode,
  priority: MascotPriority,
  ttl: number,
  cta?: MascotCta,
): EventSpec => ({ emotion, mode, priority, ttl, cta });

export const EVENT_TABLE: Record<MascotEvent, EventSpec> = {
  // AUTH
  USER_WELCOME:        S("happy", "companion", PRIORITY.info, 9000),
  LOGIN_RETURN:        S("happy", "companion", PRIORITY.ambient, 7000),
  PROFILE_COMPLETED:   S("proud", "celebrator", PRIORITY.notable, 8000),
  // ONBOARDING
  DESTINATION_SELECTED: S("excited", "navigator", PRIORITY.info, 7000),
  GOAL_SELECTED:        S("happy", "navigator", PRIORITY.info, 7000),
  ONBOARDING_COMPLETED: S("celebrating", "celebrator", PRIORITY.notable, 9000),
  // VISA
  VISA_STARTED:             S("thinking", "navigator", PRIORITY.info, 8000),
  CHECKLIST_CREATED:        S("happy", "navigator", PRIORITY.info, 8000),
  CHECKLIST_ITEM_COMPLETED: S("proud", "navigator", PRIORITY.info, 5000),
  DOCUMENT_UPLOADED:        S("thinking", "navigator", PRIORITY.info, 4000),
  DOCUMENT_SCANNING:        S("scanning", "navigator", PRIORITY.info, 0),
  DOCUMENT_VALID:           S("happy", "guardian", PRIORITY.notable, 8000),
  DOCUMENT_WARNING:         S("concerned", "guardian", PRIORITY.warning, 0),
  VISA_PROGRESS_UPDATED:    S("excited", "navigator", PRIORITY.info, 8000),
  // HOUSING
  HOUSING_SEARCH:      S("thinking", "discoverer", PRIORITY.ambient, 6000),
  VERIFIED_LISTING:    S("happy", "guardian", PRIORITY.info, 7000),
  SAVED_HOUSING:       S("happy", "discoverer", PRIORITY.info, 5000),
  SUSPICIOUS_LISTING:  S("alert", "guardian", PRIORITY.critical, 0),
  // JOBS
  JOB_MATCH_FOUND:      S("excited", "discoverer", PRIORITY.info, 9000),
  SPONSORSHIP_MATCH:    S("excited", "discoverer", PRIORITY.info, 9000),
  JOB_SAVED:            S("winking", "discoverer", PRIORITY.info, 5000),
  APPLICATION_SUBMITTED: S("celebrating", "celebrator", PRIORITY.notable, 9000),
  // OPPORTUNITIES
  // Reserved for genuinely rare finds — overusing surprise turns it into noise.
  SCHOLARSHIP_FOUND:    S("surprised", "discoverer", PRIORITY.info, 10000),
  OPPORTUNITY_MATCH:    S("excited", "discoverer", PRIORITY.info, 9000),
  DEADLINE_APPROACHING: S("alert", "navigator", PRIORITY.warning, 0),
  // MENTORSHIP
  MENTOR_MATCHED: S("happy", "companion", PRIORITY.info, 8000),
  MENTOR_BOOKED:  S("celebrating", "celebrator", PRIORITY.notable, 8000),
  MENTOR_MESSAGE: S("happy", "companion", PRIORITY.info, 8000),
  // COMMUNITY
  FIRST_POST:             S("happy", "companion", PRIORITY.info, 7000),
  ANSWER_RECEIVED:        S("excited", "companion", PRIORITY.info, 7000),
  COMMUNITY_CONTRIBUTION: S("proud", "celebrator", PRIORITY.notable, 7000),
  // PROGRESS
  GOAL_COMPLETED:           S("celebrating", "celebrator", PRIORITY.notable, 9000),
  MILESTONE_REACHED:        S("celebrating", "celebrator", PRIORITY.notable, 9000),
  JOURNEY_STAGE_COMPLETED:  S("proud", "celebrator", PRIORITY.notable, 9000),
  // SAFETY
  SCAM_WARNING:          S("alert", "guardian", PRIORITY.critical, 0),
  VERIFICATION_REQUIRED: S("serious", "guardian", PRIORITY.warning, 0),
  EMERGENCY_MODE:        S("serious", "guardian", PRIORITY.critical, 0),
  // SYSTEM
  THINKING:       S("thinking", "navigator", PRIORITY.ambient, 0),
  // `notable`, not `warning`: an error should always surface (never rate-limited)
  // but it's a transient system failure, not a risk the user must act on — so it
  // fades rather than pinning like DOCUMENT_WARNING does.
  ERROR:          S("confused", "companion", PRIORITY.notable, 7000),
  SUCCESS:        S("happy", "companion", PRIORITY.info, 5000),
  IDLE_REMINDER:  S("happy", "companion", PRIORITY.ambient, 8000),
};

export const IDLE_STATE: MascotState = {
  emotion: "idle",
  mode: "companion",
  event: null,
  message: null,
  cta: null,
  priority: PRIORITY.ambient,
};

/**
 * Accent colour per mode — drives the face glow, aura and cape tint.
 * Values taken from the canonical character sheet
 * (`frontend/public/mascot/atlas-character-sheet.png`); see docs/MASCOT.md Part 1.
 */
export const MODE_COLOR: Record<MascotMode, string> = {
  companion:  "#4fd8f0", // canon cyan — the resting eye colour
  navigator:  "#38bdf8", // sky — focus
  discoverer: "#e9b949", // canon gold — discovery, achievement
  guardian:   "#f0564a", // alert red — protection
  celebrator: "#a78bfa", // violet — celebration
};

/** Fixed character colours that never vary by mode. */
export const ATLAS_PALETTE = {
  shell:      "#f4f7fb",
  shellDark:  "#c9d4e4",
  navy:       "#1b3b6f",
  navyDeep:   "#10233f",
  gold:       "#e9b949",
  goldLight:  "#f5d07a",
  blush:      "#f79bb0",
  mouth:      "#e4557e",
} as const;
