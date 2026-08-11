# GlobalBridge — Design System Reference

This is a snapshot of the *actual* design system in the codebase today — every
token, pattern and component here is grounded in real files, not aspiration.
Use it as (1) a reference when building new screens so they stay consistent,
and (2) an audit: the **Inconsistencies & Opportunities** section at the end
calls out where the current implementation drifts from its own system.

Source of truth: `frontend/src/app/globals.css` (Tailwind CSS 4, CSS-first
`@theme`), plus the component files referenced throughout.

---

## 1. Brand identity

- **Name**: GlobalBridge — a bridge/globe glyph (`Logo.tsx`), teal gradient
  (`#14b8a6` → `#0f766e`), literal bridge-over-globe imagery reflecting the
  product's core metaphor (helping someone cross from one country's systems
  into another's).
- **Positioning** (from `layout.tsx` metadata): *"Your Trusted Guide
  Abroad"* — AI-powered platform for international students and immigrants:
  visa guidance, verified housing, mentorship, jobs.
- **Voice**: plain-language, safety-first. The platform's stated philosophy
  (from earlier project docs) is "reduce overwhelm and protect users from
  being exploited" — this shows up in copy choices (e.g. Scam Shield,
  verified badges) more than in visual style.

## 2. Color system

Defined once as CSS custom properties in `@theme`, then **overridden inside
`.dark`** — every token keeps its name across themes, only the value changes.
This is the single most important structural fact about the color system:
**never hardcode a hex value in a component; always reference the token.**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-cream-50` | `#f8fafc` | `#0a0f1a` | page background |
| `--color-cream-100` | `#f1f5f9` | `#111827` | muted/alt background, card-on-card |
| `--color-cream-200` | `#e2e8f0` | `#1f2937` | borders, dividers |
| `--color-cream-300` | `#cbd5e1` | `#374151` | lighter borders, input borders |
| `--color-cream-400` | `#94a3b8` | `#4b5563` | muted UI elements |
| `--color-clay-500/600/700` | `#0d9488`→`#115e59` | `#14b8a6`→`#5eead4` | **primary/accent** (brighter in dark for contrast) |
| `--color-ink-900…500` | `#0f172a`→`#64748b` | `#f1f5f9`→`#64748b` | text, darkest→lightest |
| `--color-leaf-500/600` | teal-green | brighter teal-green | success/verified |
| `--color-sky-500/600` | blue | brighter blue | info accents |
| `--color-amber-500` | amber | brighter amber | warning |
| `--color-surface` / `--color-surface-alt` | white / `#f8fafc` | `#111827` / `#0f172a` | card/panel backgrounds |

Naming is metaphor-first (cream/clay/ink/leaf/sky), not literal
(gray/teal/blue) — intentional, but it means a new contributor has to learn
the mapping before they can reach for the right token. There is no
`--color-danger`/`--color-error` token — destructive/error states borrow
Tailwind's built-in `red-*` scale directly instead (see §12).

**Semantic role summary**: `clay` = primary brand action & focus rings,
`ink` = text hierarchy, `cream` = neutrals/surfaces/borders, `leaf` = success,
`sky` = info, `amber` = warning, raw `red-*` = error/destructive.

## 3. Typography

```css
--font-display: "Tiempos", "Charter", "Georgia", serif;   /* h1–h4 */
--font-sans:    "Inter", "Söhne", system-ui, sans-serif;  /* body, default */
--font-mono:    "JetBrains Mono", ui-monospace, monospace; /* .facet-label, timestamps */
```

- All headings (`h1`–`h4`) automatically switch to `font-display` with
  `-0.02em` letter-spacing via `@layer base` — no per-heading class needed.
- `h2`–`h4` are weight 500 (not bold) — the serif display face carries
  enough presence on its own; heavy weight would fight it.
- Serif-for-headings / sans-for-body is an editorial pairing, distinct from
  the typical SaaS all-sans look — reinforces the "guide" positioning over a
  "tool" positioning.
- No documented type scale (no `--text-*` custom sizes) — headings rely on
  Tailwind's default `text-2xl`/`text-3xl`/etc. chosen ad hoc per component.
  This is the single biggest gap in the type system (see §12).

## 4. Spacing & shape

```css
--radius-sm: 0.375rem;   /* 6px  — badges, small chips */
--radius-md: 0.625rem;   /* 10px — inputs, buttons */
--radius-lg: 1rem;       /* 16px — cards */
--radius-xl: 1.5rem;     /* 24px — large panels, drawers */
```

Spacing itself uses Tailwind's default scale directly (no custom spacing
tokens) — `px-4 py-2.5`, `gap-2`, `space-y-4` etc. throughout. Consistent in
practice because most components converge on the same handful of values
(`2.5`, `3`, `4`, `5`, `6`), but nothing enforces it.

## 5. Iconography

**lucide-react** exclusively (`^0.460.0`) — no mixed icon sets found anywhere
in the audit. Sizes cluster around three values: `13–14` (inline/badge),
`16–18` (buttons, form fields, nav), `20–24` (feature/section icons). Stroke
width is the library default except where emphasis matters (e.g. the mobile
bottom nav bolds the active icon: `strokeWidth={active ? 2.4 : 2}`).

The one deliberate exception is `GoogleIcon` in `auth/page.tsx` — hand-drawn
SVG using Google's official 4-color mark, because brand guidelines forbid
recoloring it to match the palette.

## 6. Core component classes

Defined in `globals.css` under `@layer components` — plain CSS classes, not
a React component library, so any element can opt in with a className:

```css
.btn-primary   /* solid ink background — the "quiet" strong action */
.btn-accent    /* solid clay-500 background — the primary CTA */
.btn-ghost     /* transparent, ink text, cream-200 hover — tertiary */
.card          /* surface bg, cream-200 border, radius-lg, 1.5rem padding */
.input         /* surface bg, cream-300 border, clay-500 focus ring */
.badge / .badge-verified / .badge-clay / .badge-sky   /* pill tags */
```

**In practice, most screens don't use these classes** — they compose
Tailwind utilities inline instead (see the auth page, dashboard cards, etc.).
The `.btn-*`/`.card`/`.input` classes exist and are correct, but adoption is
inconsistent — some pages use `.card`, others hand-roll
`bg-[var(--color-surface)] border border-cream-200 rounded-lg p-6` achieving
the same visual result through a different path. Not a bug, but a
maintenance cost (see §12).

## 7. Motion

Four libraries, each with a distinct job — none of them overlap in practice:

| Library | Role |
|---|---|
| **Lenis** | Smooth-scroll wrapper (`SmoothScroll.tsx`) around the whole app |
| **GSAP** + ScrollTrigger | Marketing-page scroll choreography (Hero, HowItWorks, section reveals) |
| **Framer Motion** | Component-level enter/exit and interaction animation |
| Hand-written CSS `@keyframes` | Small reusable effects: `fade-up`, `pulse-glow`, `spin-slow`, `float-bob` (Atlas's idle bob) |

**Every animation respects `prefers-reduced-motion`** — enforced two ways:
a global CSS media query in `globals.css` that clamps all animation/transition
durations to near-zero, *and* a `ReducedMotionGuard` component mounted at the
root that presumably gates the JS-driven (GSAP/Framer) animations the CSS
rule can't reach. This dual approach is correct and worth preserving as new
motion is added — a new GSAP timeline must check the same signal, the CSS
rule alone won't stop it.

Custom easing/duration conventions actually used: `duration-200` for
micro-interactions (hover, toggle), `0.5s ease-out` for `fade-up` reveals,
`3–3.4s` for ambient loops (`float-bob`, `spin-slow`).

## 8. Layout & responsive strategy

- **Breakpoint convention**: mobile-first, `md:` (768px) is the primary
  desktop cutover used almost everywhere — desktop sidebar (`hidden
  md:flex`) vs. mobile bottom nav + drawer (`md:hidden`). `lg:`/`xl:` appear
  only inside marketing-page grids, not in app chrome.
- **Signed-in app shell** (`(app)/layout.tsx`): fixed 240px (`w-60`) desktop
  sidebar with up to 16 items; on mobile, collapses to a 4-item
  `MobileBottomNav` + a shared `MobileSidebar` drawer opened by "More" — see
  `docs/ARCHITECTURE.md` for the full navigation contract.
- **Admin console**: separate route group `(admin)`, its own `MobileSidebar
  preset="admin"` — same drawer component, different item set, not a
  parallel implementation.
- **Auth pages**: split-screen `md:grid-cols-2` — brand/trust panel on the
  left (hidden below `md:`), form on the right. One shared component drives
  both sign-in and sign-up via a `mode` flag rather than two pages.
- **Touch targets**: minimum 44×44px enforced via `min-h-11 min-w-11`
  (WCAG 2.5.5), applied explicitly wherever a control might otherwise be
  smaller than that (icon-only buttons, the password-reveal toggle, the
  mobile bottom nav's `min-h-14`).
- **Safe-area insets**: `env(safe-area-inset-bottom, 0px)` used on the
  mobile bottom nav and Atlas's dock so neither collides with a phone's home
  indicator.

## 9. Dark mode

Class-based (`.dark` on `<html>`), not the `prefers-color-scheme` media
query alone — a small inline script in `layout.tsx`'s `<head>` reads
`localStorage['theme']` before hydration and applies the class synchronously,
avoiding a flash of the wrong theme. `ThemeToggle.tsx` flips the class and
persists the choice. Because every color is a CSS variable swapped inside
`.dark`, **components almost never need a `dark:` variant for color** — they
just reference `var(--color-*)` or the Tailwind color utilities that resolve
to those variables. `dark:` utility classes still appear directly in some
components (e.g. `dark:border-gray-800`, `dark:bg-gray-800`) rather than
through the token system — a second, parallel way of doing the same thing
(see §12).

## 10. Internationalization & RTL

14 locales (`en, ar, de, es, fr, hi, it, ja, ko, pt, ru, sw, tr, zh`), Arabic
is RTL. RTL support is hand-rolled in `globals.css` as a block of `[dir="rtl"]`
overrides for specific utility classes (`.ml-2`, `.pl-4`, `.space-x-3`,
etc.) rather than using Tailwind's built-in logical-property variants
(`ms-*`/`me-*`/`ps-*`/`pe-*`). This works but is a maintenance trap: **any
new component that uses a physical-direction utility not already covered in
that override list will silently break in Arabic.** `AtlasStage` and other
newer components sidestep this by branching on a `useIsRTL()` hook and
choosing `left-3`/`right-3` explicitly instead of relying on the CSS
overrides. See §12 for the recommendation.

## 11. The Atlas mascot as a design element

Atlas is the one place the design system extends into *behavior*, not just
appearance. Rendered as a cropped brand-art PNG (`AtlasPortrait.tsx`, not
live 3D — chosen because a rendered illustration reads better than
primitives at 60–104px and matches the brand sheet exactly), docked in a
screen corner, RTL-mirrored, offset above the mobile bottom nav via a
`--gb-dock-offset` CSS variable. Emotion is communicated through:
- a mode-colored glow ring (`MODE_COLOR` map),
- float intensity (`animate-float-bob`, stilled entirely for
  warning/alert/serious states — stillness reads as "pay attention"),
- the message content itself, gated by a priority/anti-fatigue policy engine
  so he doesn't nag.

Treat Atlas as a *design constraint*, not just a component: any new
notification-shaped UI should ask whether it's an Atlas event or a separate
toast, rather than inventing a third pattern.

## 12. Inconsistencies & opportunities

Concrete, actionable items — ranked by how much UI drift they're currently
causing:

1. **No documented type scale.** Headings and body text sizes are chosen
   per-component from Tailwind's default scale (`text-2xl`, `text-3xl`,
   `text-sm`, …) with no named steps. Result: comparable headings across
   pages (e.g. a dashboard section header vs. a settings section header)
   can end up at different sizes with no way to tell that was unintentional.
   **Fix**: add a small `--text-*` scale to `@theme` (e.g.
   `display-lg/display-md/heading/body/caption`) and migrate headings to it
   incrementally.

2. **`.btn-*`/`.card`/`.input` utility classes exist but are inconsistently
   adopted.** Many screens hand-roll the equivalent Tailwind utility string
   instead of using the class. Both render identically today, but a future
   brand tweak (e.g. changing card border-radius) requires editing one CSS
   rule *and* grepping for every hand-rolled equivalent. **Fix**: prefer the
   existing `.card`/`.btn-*`/`.input` classes in new work, and consider a
   pass to replace hand-rolled equivalents where trivial.

3. **Two parallel dark-mode mechanisms.** Most color comes "for free" via
   CSS variables that flip inside `.dark`; some newer components instead add
   explicit `dark:` Tailwind utilities (`dark:bg-gray-800`,
   `dark:border-gray-700`) using Tailwind's raw gray scale rather than the
   `cream`/`ink` tokens. Both work, but they can drift out of sync — a raw
   `dark:bg-gray-800` won't move if `--color-cream-100` is retuned.
   **Fix**: standardize on token references; reserve raw `dark:` utilities
   for one-offs that genuinely have no token equivalent.

4. **RTL overrides are utility-class-specific, not systemic.** The
   `[dir="rtl"]` block in `globals.css` only flips the specific utility
   classes someone thought to add (`.ml-2`, `.pl-4`, …). A new component
   using `.ml-5` or `.pr-6` — plausible, those aren't unusual spacing values
   — will silently fail to mirror in Arabic with no build-time warning.
   **Fix**: for new components, prefer Tailwind's logical-property utilities
   (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) which mirror
   automatically and need no override list at all; reserve the manual RTL
   hook pattern (`useIsRTL()`) for cases like Atlas where positioning logic
   is genuinely conditional, not just a class flip.

5. **No `--color-danger` token.** Error/destructive states reach for raw
   Tailwind `red-*` values directly (see the auth page's error banner:
   `border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20
   text-red-700 dark:text-red-400`). This is fine as a *pattern* — it's used
   consistently — but it means red doesn't participate in the same
   light/dark auto-flip the rest of the palette gets, so both variants must
   be spelled out by hand every time. **Fix**: promote it to a token pair
   (`--color-danger` / `--color-danger-bg`) the same way `leaf`/`sky`/`amber`
   already work.

6. **Route surface is large (33 top-level pages, several with dynamic
   children) with no visible component-level style guide beyond this
   document.** Nothing here is wrong, but a Storybook-style catalog (even a
   single `/dev/components` route gated out of production) would make the
   `.card`/`.btn-*`/badge variants and the Atlas states easy to eyeball
   together — right now, verifying visual consistency means opening several
   real pages side by side.

7. **Icon size isn't tokenized either** — `13`, `14`, `16`, `18`, `20`, `24`
   all appear as literal `size={N}` props with no named scale. Low priority
   (the values already cluster sensibly) but worth folding into the same
   type-scale work in item 1 if that gets picked up.

## 13. Component inventory (for orientation)

```
components/
  Navbar.tsx, MobileSidebar.tsx, MobileBottomNav.tsx   — navigation
  Logo.tsx, ThemeToggle.tsx, LanguageSwitcher.tsx        — chrome
  Hero.tsx, HowItWorks.tsx, ServiceSection.tsx,
  MentorshipSection.tsx, ReviewsSection.tsx,
  LifeSupportSection.tsx, ClosingCTA.tsx, AiSuiteShowcase.tsx  — marketing sections
  HeroVideo.tsx, AirplanePath.tsx, FacetMask.tsx,
  ScrubTextAnimation.tsx, animations.tsx                 — motion/visual set pieces
  CommandPalette.tsx, Toast.tsx, Skeleton.tsx, SaveButton.tsx — app UI primitives
  AuthGuard.tsx, AdminGuard.tsx, RoleGuard.tsx, AuthSync.tsx — auth/access wrappers
  JobsCard.tsx, VisaChecklist.tsx, OpportunitiesPreview.tsx  — domain cards
  mascot/AtlasStage.tsx, mascot/AtlasPortrait.tsx        — Atlas
  pwa/PWAProvider.tsx, pwa/NotificationToggle.tsx        — PWA UI
  ui/interactive-globe.tsx, globe/GlobeScene.tsx         — R3F/three.js set pieces
  footer/Footer.tsx, footer/FacetField.tsx,
  footer/LiveCounter.tsx, footer/Newsletter.tsx, footer/WorldClock.tsx — footer
```

33 top-level routes across marketing (`/`, `/about`, `/pricing`, `/help`,
`/contact`, legal pages), auth (`/auth`, plus legacy `/login` `/register`
`/signup` `/forgot-password` `/reset-password` routes), the signed-in app
(`(app)/*` — dashboard, messages, jobs, housing, opportunities, community,
toolkit, tools/*), and admin (`(admin)/*`).

---

**How to use this doc**: when building a new screen, start from §2–§8 for
the tokens and patterns that already exist, and treat §12 as a checklist of
traps to avoid repeating. This file describes what's actually in the
codebase as of this audit — if you change a token or introduce a new
pattern, update this doc in the same PR so it doesn't go stale the way the
old platform docs did (see `docs/ARCHITECTURE.md` for that history).
