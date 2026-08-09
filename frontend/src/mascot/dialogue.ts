/**
 * Atlas's voice.
 *
 * Personality rules that shaped every line below (spec §30):
 *  - Never shame the user or make them feel stupid for not knowing something.
 *  - Never pretend to be an immigration authority; never invent visa rules.
 *    Atlas says "based on official information" and pushes users to verify.
 *  - Calm when there's a problem, protective around scams, excited about finds.
 *  - Warm and reassuring, never childish.
 *
 * Each event holds several variants so Atlas doesn't become repetitive (§29).
 * Placeholders use the app's existing {param} interpolation syntax.
 *
 * i18n (§24): `resolveMessage` first tries the `mascot.<EVENT>` i18n key so
 * translations can be added per-locale without touching this file; if that key
 * is missing it falls back to a random English variant below.
 */

import type { MascotEvent, MascotParams } from "./types";

export const DIALOGUE: Record<MascotEvent, string[]> = {
  // ── AUTH ──────────────────────────────────────────────────────────────
  USER_WELCOME: [
    "Welcome to GlobalBridge. Your journey starts here. 🌍",
    "Hi! I'm Atlas. You don't have to figure this out alone.",
    "Let's figure out where you're going and what you'll need.",
  ],
  LOGIN_RETURN: [
    "Welcome back. Ready to pick up where we left off?",
    "Good to see you again. Your journey's still on track.",
    "Back at it! Let's keep moving.",
  ],
  PROFILE_COMPLETED: [
    "Your profile's complete. That makes everything ahead easier.",
    "Nicely done — a complete profile means better matches for you.",
  ],

  // ── ONBOARDING ────────────────────────────────────────────────────────
  DESTINATION_SELECTED: [
    "{destination}! Great choice. Let's get you prepared.",
    "{destination} it is. I'll point us in that direction.",
    "Locking in {destination}. I'll tailor everything from here.",
  ],
  GOAL_SELECTED: [
    "Got it. I'll keep {goal} front and centre.",
    "{goal} it is — I'll build your next steps around that.",
  ],
  ONBOARDING_COMPLETED: [
    "You're all set up. Let's start your journey. 🚀",
    "Setup complete! From here on, I'll guide you step by step.",
  ],

  // ── VISA ──────────────────────────────────────────────────────────────
  VISA_STARTED: [
    "Don't worry. We'll take this one step at a time.",
    "Visas look intimidating from the outside. Let's break it down.",
    "I'll walk you through this — one step at a time.",
  ],
  CHECKLIST_CREATED: [
    "I've organised your documents into steps.",
    "Here's your checklist. Work down it at your own pace.",
    "I've broken this into manageable pieces for you.",
  ],
  CHECKLIST_ITEM_COMPLETED: [
    "That's one more done. Keep going.",
    "Checked off. You're moving.",
    "Another step behind you.",
  ],
  DOCUMENT_UPLOADED: ["Let me check that for you.", "Got it — taking a look now."],
  DOCUMENT_SCANNING: ["Scanning your document…", "Reading through this…", "One moment, checking this over…"],
  DOCUMENT_VALID: [
    "I've checked it. Nothing obvious looks wrong.",
    "This looks good. Let's check the next requirement.",
    "Nothing stood out to me here. Onward.",
  ],
  DOCUMENT_WARNING: [
    "Hold on — I found something worth reviewing before you continue.",
    "One thing to double-check before you submit this.",
    "I spotted something you'll want to look at first.",
  ],
  VISA_PROGRESS_UPDATED: [
    "You're {percent}% ready for your journey to {destination}.",
    "{percent}% of the way there. Steady progress.",
    "Your {destination} preparation is {percent}% complete.",
  ],

  // ── HOUSING ───────────────────────────────────────────────────────────
  HOUSING_SEARCH: ["Let's find you somewhere safe and suitable.", "I'll help you sort the real listings from the rest."],
  VERIFIED_LISTING: [
    "{count} of these have been verified. 🛡️",
    "Good news — {count} here are verified listings.",
    "{count} verified listings in this set. Those are the safer bets.",
  ],
  SAVED_HOUSING: ["Saved. I'll keep it handy for you.", "Got it — added to your saved places."],
  SUSPICIOUS_LISTING: [
    "Hold on. Let's verify this before you proceed.",
    "Something about this listing needs your attention.",
    "Before you send anyone money — let's check this carefully.",
  ],

  // ── JOBS ──────────────────────────────────────────────────────────────
  JOB_MATCH_FOUND: [
    "I found {count} roles matching your profile.",
    "Look what I found — {count} jobs worth a look.",
    "{count} openings here line up with what you're after.",
  ],
  SPONSORSHIP_MATCH: [
    "{count} of these offer visa sponsorship.",
    "Good news — {count} sponsor visas.",
  ],
  JOB_SAVED: ["Nice find. I've saved it for you.", "Saved — you can come back to it anytime."],
  APPLICATION_SUBMITTED: ["Application submitted. Good luck! 🚀", "That's in. Fingers crossed for you."],

  // ── OPPORTUNITIES ─────────────────────────────────────────────────────
  SCHOLARSHIP_FOUND: [
    "Wait… I think I found something you'll like.",
    "Look what I found! ✨",
    "This one looks worth your time.",
  ],
  OPPORTUNITY_MATCH: [
    "{count} opportunities here worth a look.",
    "I found {count} that might suit you.",
    "{count} matches — have a scroll through.",
  ],
  DEADLINE_APPROACHING: [
    "Heads up — {title} closes in {days} days.",
    "{title} is coming up in {days} days. Still time, but not loads.",
  ],

  // ── MENTORSHIP ────────────────────────────────────────────────────────
  MENTOR_MATCHED: [
    "You don't have to figure this out alone.",
    "Someone who's already made this journey could help with yours.",
  ],
  MENTOR_BOOKED: [
    "Great choice. Someone who's been through this can really help.",
    "Booked. They've walked this road already.",
  ],
  MENTOR_MESSAGE: ["You've got a message from your mentor.", "Your mentor replied."],

  // ── COMMUNITY ─────────────────────────────────────────────────────────
  FIRST_POST: ["Welcome to the community! Someone will likely have an answer soon.", "Posted. People here are generally quick to help."],
  ANSWER_RECEIVED: ["Looks like you found some help!", "Someone answered your question."],
  COMMUNITY_CONTRIBUTION: ["Nice — you're already helping someone else on their journey.", "You just made this easier for someone. Thank you."],

  // ── PROGRESS ──────────────────────────────────────────────────────────
  GOAL_COMPLETED: ["Amazing! Another step toward your new life abroad.", "That's done. Genuinely well played."],
  MILESTONE_REACHED: ["You did it! 🌍🚀", "Big milestone. Take a second to enjoy it."],
  JOURNEY_STAGE_COMPLETED: ["That's a whole stage complete. You're really moving now.", "Stage cleared. On to the next."],

  // ── SAFETY ────────────────────────────────────────────────────────────
  SCAM_WARNING: [
    "Hold on. This has strong scam signals — treat it as fraudulent until proven otherwise.",
    "Stop here. This looks like a scam targeting newcomers.",
    "Please don't send money or documents. This shows classic fraud patterns.",
  ],
  VERIFICATION_REQUIRED: [
    "Before you continue, let's verify this.",
    "Let's confirm this through an official source first.",
  ],
  EMERGENCY_MODE: [
    "You're in an emergency situation. Let's get you the right help.",
    "Stay with me. Here's who to contact right now.",
  ],

  // ── SYSTEM ────────────────────────────────────────────────────────────
  THINKING: ["Thinking this through…", "Let me work through that…", "One moment…"],
  ERROR: [
    "Something didn't go as planned. Let's try that again.",
    "That didn't work — not your fault. Want to retry?",
  ],
  SUCCESS: ["Done.", "All set."],
  IDLE_REMINDER: ["Hey — your journey is waiting for you.", "Still here whenever you need me."],
};

/** Deterministic-per-call random variant. */
function pick(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0];
}

function interpolate(template: string, params?: MascotParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

/**
 * Resolve the line Atlas should say.
 *
 * @param translate the app's `t()` — returns the key itself when a translation
 *   is missing, which is how we detect "not translated yet" and fall back.
 */
export function resolveMessage(
  event: MascotEvent,
  params: MascotParams | undefined,
  translate?: (key: string, p?: MascotParams) => string,
): string {
  if (translate) {
    const key = `mascot.${event}`;
    const translated = translate(key, params);
    if (translated && translated !== key) return translated;
  }
  return interpolate(pick(DIALOGUE[event] ?? ["…"]), params);
}
