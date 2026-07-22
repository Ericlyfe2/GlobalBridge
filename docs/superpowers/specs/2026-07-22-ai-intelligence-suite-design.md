# GlobalBridge AI Intelligence Suite — Design

**Date:** 2026-07-22
**Author:** Eric Asante (with Claude)
**Status:** Approved for implementation

## Goal

Add a cohesive, demo-ready **AI Intelligence Suite** to GlobalBridge that visibly extends
the platform's trust-and-safety and AI-guidance mission. Three additive features, each fully
functional in a live demo **even without an `OPENAI_API_KEY`** (via the established
`mockFallback` pattern already used by `/api/ai/doc-check`).

Purely additive — no schema changes, no changes to existing feature behavior.

## Features

### 1. AI Scam Shield — `/tools/scam-shield` (flagship)
Paste a suspicious rental listing, job offer, scholarship message, or DM. Returns:
- **Risk score 0–100** rendered as an animated color-coded gauge (leaf ≤ 33 / amber ≤ 66 / red > 66).
- **Detected red flags** — list of `{ phrase, category, why }`, with the exact phrases
  highlighted inline inside the pasted text.
- **Verdict** — one-line plain-English call (`Likely safe` / `Be cautious` / `High scam risk`)
  plus a short newcomer-focused explanation and recommended next steps.
- **Report to admin** — one tap posts to the existing backend moderation/scam-alert flow
  (best-effort; degrades to a local confirmation if the backend is unreachable).

Route: `POST /api/ai/scam-check`
- Body: `{ text: string, kind?: "housing" | "job" | "scholarship" | "message" }`
- Returns: `{ score, verdict, summary, flags: [{ phrase, category, why, severity }], advice: string[] }`
- Rate limit: 10 / min / IP. Strict-JSON parse via shared `extractJson`. Three canned
  `mockFallback` examples (rental scam / job scam / safe listing) chosen by heuristic.

### 2. AI Visa Roadmap — `/tools/visa-roadmap`
Inputs: origin country, destination country, purpose (study / work / settle). Generates an
**animated vertical timeline** of phases, each with: title, timeframe, estimated cost,
required documents, and a tip. Reveal-on-mount motion using the existing `animations`
helpers / CSS transitions (no new heavy deps).

Route: `POST /api/ai/visa-roadmap`
- Body: `{ origin, destination, purpose }`
- Returns: `{ title, totalWeeks, phases: [{ id, title, timeframe, cost, documents: string[], tip }] }`
- Rate limit 8 / min / IP. `mockFallback` returns a realistic study-visa roadmap.

### 3. Readiness Score — `/tools/readiness` + student dashboard card
An **animated radial meter** scoring 5 pillars (documents, finances, housing, job, community),
each 0–100, combined into an overall score, plus an AI-generated **top-3 next actions** list.
Inputs come from a lightweight self-report form (and can be pre-filled from localStorage
profile hints where available).

Route: `POST /api/ai/readiness`
- Body: `{ pillars: { documents, finances, housing, job, community }, destination?, purpose? }`
- Returns: `{ overall, pillars: [{ key, label, score, note }], actions: [{ title, detail, pillar }] }`
- Rate limit 8 / min / IP. `mockFallback` computes a deterministic score from the inputs.

## Architecture / patterns (match existing code exactly)

- **Server routes**: Next.js App Router route handlers under `frontend/src/app/api/ai/*`,
  `runtime = "nodejs"`, `new OpenAI({ apiKey, baseURL })`, model from
  `OPENAI_MODEL || "gpt-4o"`, shared `rateLimit`/`clientIp`/`tooMany`, `extractJson`, and a
  `mockFallback` so the demo never fails. No key → return mock 200.
- **Client pages**: `"use client"` pages under `frontend/src/app/(app)/tools/*` using existing
  design tokens (`card`, `btn-accent`, `badge`, `input`, `ink-*`, `cream-*`, `clay-*`,
  `leaf-*`, `amber-*`, `red-*`) and `lucide-react` icons. Same header/left-control/right-result
  layout as `doc-checker`.
- **Navigation**: add entries to the student sidebar (`(app)/layout.tsx`), the
  `CommandPalette` "AI Tools" group, and the `MobileSidebar`.
- **Dashboard**: embed a compact Readiness card + a Scam Shield promo tile on the student
  dashboard.

## Testing

Vitest unit tests (matching existing `frontend/src/__tests__` style) covering, per route module,
the pure helpers: `extractJson` happy/fenced/garbage paths and `mockFallback` shape/among
the three scam examples. No network calls in tests.

## Out of scope (YAGNI)

- No real OCR / file parsing for Scam Shield (text paste only).
- No new DB tables; Report reuses existing moderation endpoints.
- No i18n locale-key additions for the new tool copy in this pass (English strings inline,
  consistent with several existing tool pages); can be extracted later.

## Risks

- Low. Additive routes/pages only. If a backend moderation endpoint shape differs, the Report
  action degrades gracefully to a local success toast.
