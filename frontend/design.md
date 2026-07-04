# Global Bridge — Landing Page Implementation Plan

A story-telling landing page for a study-abroad platform (visa guidance,
verified housing, mentorship, jobs, life support). Stack: **Next.js 16**,
**Tailwind CSS v4**, **GSAP + ScrollTrigger**, **Lenis** smooth scroll.
Everything below is written to be buildable as-is by a junior developer or
another AI, in order.

---

## 1. Concept, in one paragraph

The signature visual is **not** literal "broken glasses" (that reads as
damage/violence — wrong tone for a platform about safety and possibility).
Reframe it as **a window whose border has fractured into facets** — an
irregular polygonal pane, still holding together as one shape, like a
windshield after a stone chip. That reframe is the whole site's structural
logic: moving abroad fractures your life into pieces (visa / home / people /
work / logistics); Global Bridge is the frame that holds those pieces as one
picture. The 5 services are literally presented as **5 facets of one pane**,
numbered 01–05 in sequence (visa → housing → people → work → daily life),
so the numbering is justified — it encodes a real chronological order, not
decoration.

One reusable component, `FacetMask`, renders this pane everywhere: video in
the hero, images (from Unsplash for now) everywhere else.

---

## 2. Design tokens

Use the CSS variables supplied by the client exactly as given — do not
invent new colors. Reference file: `app/globals.css`.

| Role | Token | Light | Notes |
|---|---|---|---|
| Background | `--color-cream-50` / `--color-surface-alt` | `#f8fafc` | Near-white → near-black in `.dark` |
| Heading text | `--color-ink-900` | `#0f172a` | |
| Body text | `--color-ink-600` | `#475569` | |
| Primary accent | `--color-clay-500` | `#0d9488` (teal) | CTA, facet seam-lines, small structural marks. Use sparingly. |
| Secondary accent | `--color-sky-500` | `#0284c7` | Gradients behind the glass mask only — never on text |
| Warm accent | `--color-amber-500` | `#d97706` | Used **once only** — the Life Support / SOS tile — so it stays special |

**Type roles**
- Display: `--font-display` (Tiempos/Charter/Georgia) — section titles + hero
  line only, large, tight tracking. Never body copy.
- Body/UI: `--font-sans` (Inter)
- Mono/data: `--font-mono` (JetBrains Mono) — the `01 · VISA` facet labels and
  stat counters, so numbering reads as data, not decoration.

Full token block (already client-approved, paste verbatim into
`app/globals.css` inside `@theme { ... }` and the `.dark { ... }` override —
see the client's original CSS, reproduced in full in §9).

---

## 3. Signature element: `FacetMask`

**What it is:** one reusable component that clips any media (`video` |
`image`) into an irregular, faceted polygon "pane," with internal teal
seam-lines that can be animated (drawn/undrawn) by whatever GSAP timeline is
driving the section it's in.

**How the clip works:** an inline `<svg width="0" height="0">` defines a
`<clipPath clipPathUnits="objectBoundingBox">` containing one `<path>` built
from straight-line segments (facets, not smooth curves — straight edges read
as "faceted glass/gem," curves read as "blob"). `objectBoundingBox` means
coordinates are 0–1, so the same path scales to any container size — this is
what makes one component reusable at hero scale, section scale, and the
small centered Mentorship scale.

The media itself (`<video>` or `<img>`, always `object-cover`) sits in a div
with `style={{ clipPath: 'url(#id)' }}`. Behind it, a soft blurred radial
gradient (`sky → clay`) gives it a glow. On top, a second absolutely
positioned `<svg>` (viewBox `0 0 1 1`) draws the same outline plus 4–6
straight `<line>` elements from a shared interior "fracture origin" point to
outer vertices — these are the crack seams. Each gets `pathLength={1}` and
`strokeDasharray: 1; strokeDashoffset: 1` so **any** GSAP tween can animate
`strokeDashoffset` from `1` to `0` for a "drawing itself in" effect,
regardless of the actual pixel length of that line — this is the trick that
makes the draw animation reusable across variants without per-shape math.

**5 hand-drawn variants** (so repeated use never looks copy-pasted):

| Variant | Used for | Character |
|---|---|---|
| `hero` | Hero video | Tall, largest, most irregular |
| `shard` | Visa, Jobs | Angular, works left or right |
| `drift` | Housing | Symmetric enough to "fly apart / reassemble" |
| `compact` | Mentorship (centered, small) | Rounder, fewer facets |
| `wide` | Closing CTA | Low and wide |

Each variant is defined as: an `outline` (SVG path string, straight `L`
segments, closed with `Z`), an `origin` point (`[x, y]` in 0–1 space, where
the internal seams radiate from), and a `seams` array (2–5 `[x, y]` points
on the outline that the origin connects to).

### Reference implementation

```tsx
// components/FacetMask.tsx
"use client";

import { forwardRef } from "react";

export type FacetVariant = "hero" | "shard" | "drift" | "compact" | "wide";

const VARIANTS: Record<
  FacetVariant,
  { outline: string; origin: [number, number]; seams: [number, number][] }
> = {
  hero: {
    outline:
      "M0.32,0.02 L0.68,0.0 L0.92,0.16 L1.0,0.4 L0.86,0.58 L0.97,0.8 L0.72,1.0 L0.44,0.94 L0.12,1.0 L0.0,0.74 L0.1,0.48 L0.0,0.22 Z",
    origin: [0.46, 0.5],
    seams: [[0.32, 0.02], [0.92, 0.16], [0.97, 0.8], [0.12, 1.0], [0.0, 0.22]],
  },
  shard: {
    outline:
      "M0.18,0.0 L0.8,0.06 L1.0,0.3 L0.9,0.6 L1.0,0.86 L0.66,1.0 L0.3,0.92 L0.0,1.0 L0.04,0.62 L0.0,0.28 Z",
    origin: [0.5, 0.44],
    seams: [[0.18, 0.0], [1.0, 0.3], [1.0, 0.86], [0.0, 1.0], [0.0, 0.28]],
  },
  drift: {
    outline:
      "M0.26,0.0 L0.7,0.04 L1.0,0.24 L0.94,0.5 L1.0,0.78 L0.76,1.0 L0.4,0.98 L0.08,1.0 L0.0,0.7 L0.14,0.42 L0.0,0.18 Z",
    origin: [0.5, 0.5],
    seams: [[0.26, 0.0], [1.0, 0.24], [1.0, 0.78], [0.08, 1.0], [0.0, 0.18]],
  },
  compact: {
    outline:
      "M0.36,0.0 L0.76,0.08 L1.0,0.38 L0.86,0.72 L0.58,1.0 L0.24,0.92 L0.0,0.62 L0.06,0.28 Z",
    origin: [0.5, 0.5],
    seams: [[0.36, 0.0], [1.0, 0.38], [0.58, 1.0], [0.0, 0.62]],
  },
  wide: {
    outline:
      "M0.1,0.06 L0.4,0.0 L0.7,0.08 L0.94,0.02 L1.0,0.3 L0.9,0.56 L1.0,0.82 L0.7,1.0 L0.36,0.94 L0.06,1.0 L0.0,0.7 L0.08,0.4 L0.0,0.16 Z",
    origin: [0.5, 0.5],
    seams: [[0.1, 0.06], [0.94, 0.02], [1.0, 0.82], [0.06, 1.0], [0.0, 0.16]],
  },
};

type BaseProps = { id: string; variant?: FacetVariant; className?: string; glow?: boolean };
type VideoProps = BaseProps & { media: "video"; src: string; poster?: string };
type ImageProps = BaseProps & { media: "image"; src: string; alt: string };
type FacetMaskProps = VideoProps | ImageProps;

const FacetMask = forwardRef<HTMLDivElement, FacetMaskProps>(function FacetMask(
  { id, variant = "shard", className = "", glow = true, ...props },
  ref
) {
  const shape = VARIANTS[variant];
  const clipId = `facet-clip-${id}`;

  return (
    <div ref={ref} className={`facet-mask relative w-full h-full ${className}`} data-facet-variant={variant}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={shape.outline} />
          </clipPath>
        </defs>
      </svg>

      {glow && (
        <div
          className="absolute -inset-6 -z-10 opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(60% 60% at 40% 35%, var(--color-sky-500) 0%, var(--color-clay-500) 45%, transparent 75%)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        className="facet-media relative w-full h-full overflow-hidden"
        style={{ clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }}
      >
        {props.media === "video" ? (
          <video className="facet-media-el w-full h-full object-cover" src={props.src} poster={props.poster} autoPlay muted loop playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="facet-media-el w-full h-full object-cover" src={props.src} alt={props.alt} />
        )}
        <div
          className="absolute inset-0 mix-blend-multiply opacity-30"
          style={{ background: "linear-gradient(150deg, var(--color-sky-600) 0%, transparent 40%, var(--color-clay-700) 100%)" }}
          aria-hidden="true"
        />
      </div>

      <svg className="facet-seams absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        <path
          d={shape.outline}
          fill="none"
          stroke="var(--color-clay-500)"
          strokeWidth={0.004}
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
          data-seam="outline"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        />
        {shape.seams.map(([x, y], i) => (
          <line
            key={i}
            x1={shape.origin[0]} y1={shape.origin[1]} x2={x} y2={y}
            stroke="var(--color-clay-500)" strokeWidth={0.003}
            vectorEffect="non-scaling-stroke" opacity={0.55}
            data-seam="crack" pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
          />
        ))}
      </svg>
    </div>
  );
});

export default FacetMask;
```

**Usage:**
```tsx
<FacetMask id="hero" variant="hero" media="video" src="/video/hero-loop.mp4" poster="/images/hero-poster.jpg" />
<FacetMask id="housing" variant="drift" media="image" src="https://images.unsplash.com/..." alt="Verified housing" />
```

---

## 4. File structure

```
global-bridge/
├─ app/
│  ├─ layout.tsx          # fonts, <Nav/>, <SmoothScroll/> wrapper
│  ├─ page.tsx             # orders every section, hero→visa curtain wrapper
│  └─ globals.css          # @theme tokens (client's CSS, verbatim) + base styles
├─ components/
│  ├─ SmoothScroll.tsx     # Lenis + ScrollTrigger RAF wiring (mount once, root)
│  ├─ ScrollOrchestrator.tsx  # THE cross-section timeline: hero text fade → zoom → pin → curtain
│  ├─ FacetMask.tsx        # signature reusable mask (§3)
│  ├─ Nav.tsx
│  ├─ Hero.tsx
│  ├─ ServiceSection.tsx   # reusable: Visa / Housing / Jobs (§6)
│  ├─ MentorshipSection.tsx
│  ├─ LifeSupportSection.tsx
│  ├─ ReviewsSection.tsx
│  ├─ ClosingCTA.tsx
│  └─ footer/
│     ├─ Footer.tsx          # assembles everything in §11a
│     ├─ FacetField.tsx      # decorative seam-line background
│     ├─ WorldClock.tsx      # live times for the 5 mentor cities
│     ├─ LiveCounter.tsx     # count-up + ambient ticker
│     └─ Newsletter.tsx      # email capture, draws its own checkmark
├─ data/
│  ├─ services.ts          # all copy in one place — see §9
│  └─ reviews.ts            # one testimonial per facet — see §7g
├─ lib/
│  └─ gsap.ts               # plugin registration singleton
├─ public/video/
│  └─ hero-loop.mp4         # client supplies this
├─ package.json
├─ next.config.ts
├─ postcss.config.mjs
└─ tsconfig.json
```

**Dependencies:** `next@16`, `react@19`, `react-dom@19`, `gsap`, `lenis`,
`tailwindcss@4`, `@tailwindcss/postcss`, `typescript`.

**Setup commands:**
```bash
npx create-next-app@latest global-bridge --typescript --tailwind --app --src-dir=false
cd global-bridge
npm install gsap lenis
# then create the files below, drop hero-loop.mp4 into public/video/
npm run dev
```

---

## 5. Scroll engine: Lenis ↔ GSAP ScrollTrigger

Mount **once**, at the root, above everything. It owns the single
requestAnimationFrame loop that both smooth-scrolling and every
`ScrollTrigger` in the app read from — this is what "tied to the same
timeline" means at the infrastructure level: one Lenis instance, one ticker,
every section's `ScrollTrigger` calls `ScrollTrigger.update` off Lenis'
`scroll` event instead of the native scroll event.

```tsx
// components/SmoothScroll.tsx
"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.1,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // route #anchor clicks through Lenis too
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a[href^='#']");
      if (!target) return;
      const id = target.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -20, duration: 1.4 });
      }
    };
    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

```ts
// lib/gsap.ts
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
let registered = false;
export function useGsapSetup() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}
export { gsap, ScrollTrigger };
```

Required CSS (already in `globals.css`, §9):
```css
html.lenis { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-stopped { overflow: hidden; }
```

---

## 6. Hero → Visa: the master pinned timeline

This is the one piece of choreography the brief calls out specifically:
**text fades away first → slight zoom into the section → pins → the next
section moves on top of it.** Everything else in the page runs on its own
independent `ScrollTrigger`, but all of them share the one Lenis/GSAP loop
from §5 — that's what "tied to the same timeline" means in practice; you do
not need (and should not build) one giant monolithic timeline for the whole
page, only for this specific pin-and-curtain handoff.

### 6a. Hero markup

Two-column: text (`id="hero-text"`) on one side, `<FacetMask variant="hero"
media="video">` wrapped in `id="hero-glass"` on the other. Background: soft
radial gradient (sky top-left, clay bottom-right) + a 5%-opacity SVG-noise
grain overlay (`.grain` class, data-URI, no JS noise generation needed).

```tsx
// components/Hero.tsx
import FacetMask from "@/components/FacetMask";

export default function Hero() {
  return (
    <section id="hero" className="relative w-full h-screen overflow-hidden flex items-center bg-cream-50">
      <div className="absolute inset-0 -z-20" style={{
        background:
          "radial-gradient(120% 90% at 15% 10%, color-mix(in srgb, var(--color-sky-500) 16%, transparent) 0%, transparent 55%), radial-gradient(100% 80% at 90% 90%, color-mix(in srgb, var(--color-clay-500) 14%, transparent) 0%, transparent 60%), var(--color-cream-50)",
      }} aria-hidden="true" />
      <div className="grain -z-10" />

      <div className="max-w-[1400px] w-full mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 md:gap-6 items-center pt-24 md:pt-0">
        <div id="hero-text" className="order-2 md:order-1 max-w-xl">
          <span className="facet-label block mb-6">Study abroad, held together</span>
          <h1 className="font-display text-[13vw] md:text-[4.4vw] leading-[0.98] tracking-tight text-ink-900">
            Your move,<br />held together.
          </h1>
          <p className="mt-6 text-base md:text-lg text-ink-600 max-w-md">
            Visa guidance, verified housing, mentorship, jobs, and life
            support — one platform, before, during, and after you arrive.
          </p>
          <div className="mt-9 flex items-center gap-5">
            <a href="#visa" className="inline-flex items-center gap-2 rounded-full bg-clay-500 text-white px-6 py-3.5 font-mono text-xs tracking-widest uppercase hover:bg-clay-600 transition-colors">
              Start free
            </a>
            <a href="#mentorship" className="font-mono text-xs tracking-widest uppercase text-ink-700 hover:text-clay-600 transition-colors underline underline-offset-4 decoration-clay-500/40">
              Meet the network
            </a>
          </div>
        </div>

        <div className="order-1 md:order-2 relative h-[46vh] md:h-[64vh] w-full">
          <div id="hero-glass" className="w-full h-full">
            <FacetMask id="hero" variant="hero" media="video" src="/video/hero-loop.mp4" poster="/images/hero-poster.jpg" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-widest uppercase text-ink-500">
        Scroll
      </div>
    </section>
  );
}
```

### 6b. The curtain wrapper (in `app/page.tsx`)

The Visa `ServiceSection` gets wrapped in a div with `id="section-visa"`.
`-mt-[100vh]` cancels the spacer that `ScrollTrigger`'s `pin: true` inserts
after the hero (the pin's `end: "+=100%"` == 1 viewport height, so the
negative margin must match that number exactly, or the handoff will jump).
Rounded top corners + a soft upward shadow sell the "sheet rising" look.

```tsx
// app/page.tsx (excerpt)
<Hero />

<div
  id="section-visa"
  className="relative z-20 -mt-[100vh] rounded-t-[2.5rem] md:rounded-t-[3.5rem] overflow-hidden shadow-[0_-50px_100px_-30px_rgba(15,23,42,0.35)]"
>
  <ServiceSection service={visa} />
</div>

<ServiceSection service={housing} />
<MentorshipSection />
<ServiceSection service={jobs} />
<LifeSupportSection />
<ReviewsSection />
<ClosingCTA />

<ScrollOrchestrator />
```

### 6c. The orchestrator itself

Mount once, after all sections exist. Sets the curtain's starting position
(`yPercent: 100`, i.e. fully below the viewport) then, on one scrubbed
timeline pinned to the hero:

1. `0 – ~0.5` — hero text fades + lifts out (`autoAlpha: 0, y: -50`)
2. `~0.05 – ~1` — hero glass scales `1 → 1.08` (the "zoom in a little")
3. `0.45 – 1` — the curtain (`#section-visa`) animates `yPercent: 100 → 0`,
   rising up and covering the pinned hero
4. In parallel, the hero glass's own seam-lines draw in
   (`strokeDashoffset: 1 → 0`) so the fracture visually "forms" as you
   scroll, reinforcing the motif right at the moment of the reveal

Wrapped in `gsap.matchMedia()` so `prefers-reduced-motion: reduce` gets the
static, fully-visible fallback instead of the pin/zoom/curtain sequence.

```tsx
// components/ScrollOrchestrator.tsx
"use client";
import { useLayoutEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function ScrollOrchestrator() {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
        const { reduced } = context.conditions as { reduced: boolean };
        const heroText = document.getElementById("hero-text");
        const heroGlass = document.getElementById("hero-glass");
        const heroSection = document.getElementById("hero");
        const curtain = document.getElementById("section-visa");
        if (!heroText || !heroGlass || !heroSection || !curtain) return;

        if (reduced) {
          gsap.set([heroText, heroGlass], { clearProps: "all" });
          return;
        }

        gsap.set(curtain, { yPercent: 100 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "+=100%",
            scrub: 0.6,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
          },
        });

        tl.to(heroText, { autoAlpha: 0, y: -50, ease: "power1.out" }, 0)
          .to(heroGlass, { scale: 1.08, ease: "none" }, 0.05)
          .to(curtain, { yPercent: 0, ease: "power2.inOut" }, 0.45);

        const seams = heroGlass.querySelectorAll('[data-seam="crack"]');
        const outline = heroGlass.querySelector('[data-seam="outline"]');
        if (outline) tl.to(outline, { strokeDashoffset: 0, ease: "none" }, 0);
        if (seams.length) tl.to(seams, { strokeDashoffset: 0, stagger: 0.02, ease: "none" }, 0.1);
      });
      return () => mm.revert();
    });

    return () => ctx.revert();
  }, []);

  return null;
}
```

**Why `-mt-[100vh]` must match `end: "+=100%"` exactly:** `pin: true` with
default `pinSpacing: true` inserts a spacer element after the hero, sized to
the pin's scroll distance (`+=100%` of the hero's height ≈ 1 viewport). The
curtain's negative margin needs to cancel that spacer so its untransformed
position sits directly under the hero; the `yPercent` tween then slides it
up independently of the spacer size. If you change the pin distance, change
the margin to match, or the handoff will visibly jump.

---

## 7. The other four sections — creative animation spec

Per the brief: **not simple entry/exit fades.** Each service gets a
distinct signature interaction tied to what it actually does, all built on
`ScrollTrigger` with `scrub` (so they're scroll-position-driven, not
autoplay), inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`.

### 7a. Shared entrance (every `ServiceSection`)
On approach (`start: "top 75%"`, `end: "top 20%"`, `scrub: 0.8`):
- `FacetMask` scales in from `0.86 → 1`
- copy lines (`.reveal-line`) stagger up + fade (`y: 36 → 0`)
- bullets stagger in from the side matching the section's layout direction
- the mask's own seam-lines draw in (`strokeDashoffset: 1 → 0`)
- a slow parallax on `.facet-media-el` (`yPercent -8 → 8` across the full
  section scroll range) so the image drifts independently of the mask

### 7b. Visa — checklist that ticks itself off
As the user scrolls through the section (`start: "top 55%"`, `end: "bottom
60%"`, `scrub: 0.6`), each checklist row's background fades in and its
checkmark path draws (`strokeDasharray: 20`, animate `strokeDashoffset: 20 →
0`), staggered one per 0.25 of scroll — reads as the checklist completing
itself as you read down the page, directly dramatizing "step-by-step
document checklist."

### 7c. Housing — facets fly apart, then reassemble
A 3×3 grid of absolutely-positioned tiles overlays the `FacetMask` image,
each tile showing a different `background-position` slice of the same
photo (a 3×3 sprite crop via `background-size: 300% 300%`). On enter
(`start: "top 85%"`, `end: "top 25%"`, `scrub: 0.7`), animate `from`
scattered positions (`xPercent: ±140, yPercent: ±60, rotation: ±25,
autoAlpha: 0`) back to `0` — the image visibly assembles itself out of
scattered fragments as you scroll in, directly dramatizing "verified
housing" — pieces coming together into one trustworthy whole.

```tsx
// shard overlay tiles — inside ServiceSection.tsx
<div className="assemble-overlay absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
  {Array.from({ length: 9 }).map((_, i) => <div key={i} className="assemble-shard" />)}
</div>
```
```css
.assemble-shard { background-image: url(<same image src>); background-size: 300% 300%; }
.assemble-shard:nth-child(1) { background-position: 0% 0%; }
.assemble-shard:nth-child(2) { background-position: 50% 0%; }
/* ...3×3 grid of background-position values 0/50/100% × 0/50/100% */
```
```ts
gsap.timeline({ scrollTrigger: { trigger: root, start: "top 85%", end: "top 25%", scrub: 0.7 } })
  .from(shards, {
    xPercent: (i) => (i % 2 === 0 ? -140 : 140),
    yPercent: (i) => (i % 3 === 0 ? -60 : 60),
    rotation: (i) => (i % 2 === 0 ? -25 : 25),
    autoAlpha: 0,
    stagger: 0.06,
    ease: "none",
  });
```

### 7d. Mentorship — a network drawing itself
Full-width, `FacetMask variant="compact"` centered small, with 6 mentor
avatars placed on a circle around it (positions computed with `sin`/`cos`
from an `angle` per mentor, in a `viewBox="0 0 100 100"` SVG). On enter:
avatars pop in with `back.out(1.6)` easing, staggered from the center
outward; simultaneously, a curved `<path>` per avatar (quadratic bezier from
center to that avatar) draws in via `strokeDashoffset` (again using the
`pathLength={1}` trick from §3). After the scroll-driven entrance, each
avatar gets an independent, non-scroll-linked `yoyo: -1` float
(`sine.inOut`, staggered durations) so the network feels alive at rest, not
just during the scroll event — this is a deliberate exception to "everything
is scroll-driven," used only for ambient life, not for narrative reveals.

```tsx
const MENTORS = [
  { name: "Amara", city: "Toronto", angle: -70 },
  { name: "Priya", city: "London", angle: -25 },
  { name: "Kwame", city: "Berlin", angle: 25 },
  { name: "Yuki", city: "Sydney", angle: 70 },
  { name: "Diego", city: "Dublin", angle: 115 },
  { name: "Noor", city: "Boston", angle: 155 },
];
const R = 42; // orbit radius, percent
// per mentor: x = 50 + R*cos(angle), y = 50 + R*sin(angle)  (angle in radians)
```
```ts
gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
gsap.timeline({ scrollTrigger: { trigger: root, start: "top 70%", end: "bottom 40%", scrub: 0.8 } })
  .from(heading, { autoAlpha: 0, y: 30, stagger: 0.1, ease: "power2.out" }, 0)
  .from(avatars, { autoAlpha: 0, scale: 0.4, stagger: { each: 0.12, from: "center" }, ease: "back.out(1.6)" }, 0.15)
  .to(lines, { strokeDashoffset: 0, stagger: { each: 0.12, from: "center" }, ease: "none" }, 0.2);

avatars.forEach((a, i) => {
  gsap.to(a, { y: i % 2 === 0 ? -8 : 8, duration: 2.4 + i * 0.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
});
```

### 7e. Jobs — counters + a tilting resume card
Two stat numbers (`data-target="12400"` sponsor roles, `data-target="86"`
interview-rate lift %) count up from 0 as they scroll into view, driven by
tweening a plain JS object (`{ val: 0 }`) and writing `Math.round(obj.val)`
into `textContent` on `onUpdate` — not GSAP's TextPlugin, so no extra plugin
dependency. Beside them, a small "resume card" mock (a few gray bars mimicking
lines of text) enters with a scroll-scrubbed pseudo-3D tilt
(`rotateY: 22 → 0, rotateX: 8 → 0`, parent has `perspective: 800`),
dramatizing "AI resume builder tuned per market."

```ts
nums.forEach((el) => {
  const target = Number(el.dataset.target ?? 0);
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    scrollTrigger: { trigger: el, start: "top 85%", end: "top 50%", scrub: 0.6 },
    onUpdate: () => { el.textContent = Math.round(obj.val).toString(); },
  });
});

gsap.fromTo(card,
  { rotateY: 22, rotateX: 8, y: 60, autoAlpha: 0 },
  { rotateY: 0, rotateX: 0, y: 0, autoAlpha: 1, ease: "none",
    scrollTrigger: { trigger: root, start: "top 70%", end: "top 25%", scrub: 0.8 } }
);
```

### 7f. Life Support — the deliberate rest beat
This is the one section with **no** `FacetMask` — a conscious contrast beat
after four visually heavy sections, presented as a plain 2×4 icon grid
instead. Tiles pop in with a `grid`-aware stagger
(`stagger: { each: 0.1, grid: [2, 2], from: "start" }`, so they visibly fill
row by row like a checklist settling into place). The Emergency SOS tile is
`--color-amber-500` (the one place that color is used) and pulses a soft
outward `box-shadow` ring on an infinite `yoyo` loop — ambient, not
scroll-scrubbed, because "always on" is the point of an SOS feature.

### 7g. Reviews — a pinned horizontal gallery, one voice per facet
Placed **after Life Support, before the Closing CTA** — not numbered 01–05,
because it isn't a 6th facet of the product, it's proof for the 5 that came
before. Structurally it's the payoff moment: pin the section vertically and
scrub the review cards horizontally as the user keeps scrolling down, so it
reads as its own contained "gallery" beat rather than another stacked
column section — the one other place on the page besides the Hero→Visa
curtain that repurposes a vertical scroll into a different kind of motion,
which is deliberate: over-using that trick would cheapen the hero's, so
this is the only other place it appears, and it's a simpler version
(scrub, no pin-and-cover).

**Content rule:** each review is tagged to exactly one of the 5 services,
and the card's `facet-label` shows that tag (`"03 · Mentorship Network"`,
same numbering as the sections themselves) — so this section functions as
a second pass through the same 5 facets, this time as testimony instead of
feature copy, closing the loop before the CTA.

```ts
// data/reviews.ts
export const reviews = [
  {
    id: "r1", serviceId: "visa", serviceIndex: "01", serviceTitle: "AI Visa Assistant",
    name: "Aiyana R.", route: "Manila → Vancouver",
    quote: "It told me exactly which biometrics appointment to book first — I would have missed the window otherwise.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r2", serviceId: "housing", serviceIndex: "02", serviceTitle: "Verified Housing",
    name: "Tomás V.", route: "Bogotá → Berlin",
    quote: "I signed my lease from home. No video call landlord ever went quiet on me.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r3", serviceId: "mentorship", serviceIndex: "03", serviceTitle: "Mentorship Network",
    name: "Hana K.", route: "Osaka → Dublin",
    quote: "My mentor met me at arrivals. That's not something a brochure tells you to expect.",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
  {
    id: "r4", serviceId: "jobs", serviceIndex: "04", serviceTitle: "Jobs & Internships",
    name: "Priya N.", route: "Chennai → Boston",
    quote: "Every listing I applied to already sponsored my visa type. I stopped wasting weeks on dead ends.",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=300&auto=format&fit=crop",
    rating: 4,
  },
  {
    id: "r5", serviceId: "life-support", serviceIndex: "05", serviceTitle: "Life Support Toolkit",
    name: "Kwame O.", route: "Accra → Sydney",
    quote: "The bank setup guide alone saved me a week of standing in the wrong lines.",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop",
    rating: 5,
  },
];
```

**Layout**
```
┌──────────────────────────────────────────────────────────┐
│  Proof, not promises                                       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐ │
│  │ 01·Visa │  │02·House│  │03·Mentor│ │04·Jobs │  │05·Life│→ scrub
│  │ (facet  │  │ (facet │  │(facet   │ │(facet  │  │(facet │
│  │  avatar)│  │ avatar)│  │ avatar) │ │ avatar)│  │avatar)│ │
│  │ "quote" │  │ "quote"│  │ "quote" │ │"quote" │  │"quote"│ │
│  └────────┘  └────────┘  └────────┘  └────────┘  └──────┘ │
│  ● ● ● ● ●  ← progress dots, filled as each card centers   │
└──────────────────────────────────────────────────────────┘
```

**Pinned horizontal scrub**, the standard GSAP technique — pin the
section, then tween the track's `xPercent` against the *vertical* scroll
distance:

```tsx
// components/ReviewsSection.tsx (core wiring)
useLayoutEffect(() => {
  const section = sectionRef.current;
  const track = trackRef.current;
  if (!section || !track) return;

  const ctx = gsap.context(() => {
    gsap.matchMedia().add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const distance = track.scrollWidth - section.offsetWidth;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.to(track, { x: -distance, ease: "none" });

      // progress dots + per-card avatar seam draw as each card centers
      const cards = track.querySelectorAll(".review-card");
      cards.forEach((card, i) => {
        const outline = card.querySelector('[data-seam="outline"]');
        const seams = card.querySelectorAll('[data-seam="crack"]');
        if (outline) tl.fromTo(outline, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" }, i / cards.length);
        if (seams.length) tl.fromTo(seams, { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.05, ease: "none" }, i / cards.length);
        ScrollTrigger.create({
          trigger: card, containerAnimation: tl, start: "left center", end: "right center",
          onToggle: (self) => card.classList.toggle("is-active", self.isActive),
        });
      });
    });

    // reduced-motion / mobile fallback: a plain vertical stack, no pin
    gsap.matchMedia().add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
      gsap.set(track, { x: 0, className: "+=is-stacked" });
    });
  }, section);

  return () => ctx.revert();
}, []);
```

Each card is a small `FacetMask variant="compact"` avatar (the same
smallest-instance idea as the footer's back-to-top button, reused again —
consistent scale language: hero = huge facet, sections = medium facet,
mentorship/reviews/footer = small facet) plus the `facet-label` service
tag, the quote (kept under 20 words so it reads at a glance mid-scroll —
this is a UX constraint, not a copyright one), the name, and the route
(`origin → destination`, echoing the "before, during, and after" framing
from the hero).

**Progress dots** (5, one per service) sit below the track, filled in as
their matching card's `ScrollTrigger` (`containerAnimation: tl`) goes
active — a small piece of orientation so the horizontal scrub doesn't feel
disorienting on a page that's otherwise vertical.

**Rating**, if shown, should NOT be star icons (breaks the "no borrowed
iconography" restraint) — render it as `"4.9"` in `font-mono`, or as 5 small
filled/unfilled facet-shaped chips reusing the same polygon language,
never a generic ★.

**Mobile / reduced-motion fallback:** the horizontal pin only runs at
`min-width: 768px` — below that, and under `prefers-reduced-motion:
reduce`, the cards render as a plain vertical stack with normal document
flow (§7a's simple fade-up entrance, not the scrub), since pinned
horizontal scroll on a narrow viewport is a common source of janky,
disorienting mobile UX and isn't worth forcing.


### 7h. Closing CTA
`FacetMask variant="wide"`, full image, reappears one last time. The
headline is split into individual `<span className="assemble-word">` words
that fly up and rotate in from `rotateX: -40` (mirroring the "assembling"
language used in Housing, now applied to the closing statement itself:
"Every piece, one bridge.") while the mask's seams draw in beneath it —
closing the loop the hero opened.

---

## 8. Accessibility & performance requirements

- Every scroll-triggered animation set (per section) must be wrapped in
  `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", …)` so
  `prefers-reduced-motion: reduce` users get content visible-by-default with
  no motion, not a broken/half-animated page.
- `ScrollOrchestrator`'s pin/curtain sequence needs its own explicit
  `reduced` branch (see §6c) since it's structural (pin), not just a tween.
- Keep `:focus-visible` outlines on (already in `globals.css`) — don't
  suppress focus rings for the sake of visual cleanliness.
- `FacetMask` video: `muted autoPlay loop playsInline`, always with a
  `poster` so there's a paint before the video loads.
- Call `ScrollTrigger.refresh()` on `window.load` (fonts/images can shift
  layout after first paint, which desyncs pin start/end points).
- Images: use Unsplash URLs with `?q=80&w=1200&auto=format&fit=crop` sizing
  params to avoid pulling full-resolution originals for a masked crop.

---

## 9. Full copy + content reference

```ts
// data/services.ts
export const services = [
  {
    id: "visa", index: "01", title: "AI Visa Assistant",
    dek: "Any visa. Any country. Zero guesswork.",
    detail: "Conversational guidance that adapts to your destination, your passport, and your timeline — with a step-by-step document checklist that updates itself as embassies change the rules.",
    bullets: [
      "Country-specific checklist, generated in minutes",
      "Plain-language answers to embassy questions",
      "Deadline tracking with reminders that actually fire",
    ],
    variant: "shard", side: "right",
  },
  {
    id: "housing", index: "02", title: "Verified Housing",
    dek: "A key waiting for you, not a listing that vanishes.",
    detail: "Every landlord is identity-checked before their listing goes live. Match with roommates who share your move-in date, and book your place before you board.",
    bullets: [
      "Identity-verified landlords only",
      "Roommate matching by city, dates, and habits",
      "Book and pay before you land — no showings needed",
    ],
    variant: "drift", side: "left",
  },
  {
    id: "jobs", index: "04", title: "Jobs & Internships",
    dek: "Filtered for the one thing that matters: sponsorship.",
    detail: "Search roles that actually sponsor your visa type, track a company's sponsorship history before you apply, and let the AI resume builder tune your CV per market.",
    bullets: [
      "Filter by visa-sponsor status, not guesswork",
      "AI resume builder tuned to local hiring norms",
      "Sponsorship-history tracker per employer",
    ],
    variant: "shard", side: "right",
  },
];

export const mentorship = {
  index: "03", title: "Mentorship Network",
  dek: "People who already lived it, one message away.",
  detail: "Connect with people who've spent years in your destination city. Join cultural hubs and events built around where you're headed, not where you're from.",
};

export const lifeSupport = {
  index: "05", title: "Life Support Toolkit",
  dek: "Everything after the flight lands.",
  detail: "Cost calculators, healthcare guides, banking setup, and an emergency SOS — all in one place, so the small logistics never become the hard part.",
  tools: [
    { label: "Cost calculator", note: "Budget by city, down to groceries" },
    { label: "Healthcare guide", note: "Insurance & clinics, explained" },
    { label: "Banking setup", note: "Open an account before you land" },
    { label: "Emergency SOS", note: "One tap, always on", sos: true },
  ],
};
```

**Unsplash placeholders** (swap for real photography later):
- Visa: `photo-1544819667-4ba807ffb0d6`
- Housing: `photo-1522708323590-d24dbb6b0267`
- Jobs: `photo-1521737604893-d14cc237f11d`
- Mentorship: `photo-1543269865-cbf427effbad`
- Closing CTA: `photo-1436491865332-7a61a109cc05`
- Mentor avatars: 6 portrait crops, `?q=80&w=300&auto=format&fit=crop`

---

## 10. `app/globals.css` — paste verbatim

```css
@import "tailwindcss";

@theme {
  --color-cream-50: #f8fafc;
  --color-cream-100: #f1f5f9;
  --color-cream-200: #e2e8f0;
  --color-cream-300: #cbd5e1;
  --color-cream-400: #94a3b8;

  --color-clay-500: #0d9488;
  --color-clay-600: #0f766e;
  --color-clay-700: #115e59;

  --color-ink-900: #0f172a;
  --color-ink-800: #1e293b;
  --color-ink-700: #334155;
  --color-ink-600: #475569;
  --color-ink-500: #64748b;

  --color-leaf-500: #14b8a6;
  --color-leaf-600: #0d9488;
  --color-sky-500: #0284c7;
  --color-sky-600: #0369a1;
  --color-amber-500: #d97706;

  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc;
  --color-text-on-primary: #ffffff;

  --font-display: "Tiempos", "Charter", "Georgia", serif;
  --font-sans: "Inter", "Söhne", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}

.dark {
  --color-cream-50: #0a0f1a;
  --color-cream-100: #111827;
  --color-cream-200: #1f2937;
  --color-cream-300: #374151;
  --color-cream-400: #4b5563;

  --color-clay-500: #14b8a6;
  --color-clay-600: #2dd4bf;
  --color-clay-700: #5eead4;

  --color-ink-900: #f1f5f9;
  --color-ink-800: #e2e8f0;
  --color-ink-700: #cbd5e1;
  --color-ink-600: #94a3b8;
  --color-ink-500: #64748b;

  --color-leaf-500: #2dd4bf;
  --color-leaf-600: #5eead4;
  --color-sky-500: #38bdf8;
  --color-sky-600: #7dd3fc;
  --color-amber-500: #fbbf24;

  --color-surface: #111827;
  --color-surface-alt: #0f172a;
}

* { box-sizing: border-box; }

html, body {
  padding: 0; margin: 0;
  background: var(--color-cream-50);
  color: var(--color-ink-900);
  font-family: var(--font-sans);
  overflow-x: hidden;
}
body { transition: background-color 0.4s ease, color 0.4s ease; }
::selection { background: var(--color-clay-500); color: #fff; }

.font-display { font-family: var(--font-display); }
.font-mono { font-family: var(--font-mono); }

.facet-label {
  font-family: var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--color-clay-500);
}

.grain {
  position: absolute; inset: 0; pointer-events: none;
  opacity: 0.05; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

html.lenis { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-stopped { overflow: hidden; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

:focus-visible { outline: 2px solid var(--color-clay-500); outline-offset: 3px; }
```

---

## 11a. Footer — the over-engineered send-off

The brief asked for this to be deliberately over-engineered, so unlike
every other section (which earns its complexity from restraint), the footer
is allowed to be the one place that does more than it strictly needs to.
The rule I held it to: **every extra piece still has to point back at
something already established on the page** — it can't just be generic
"cool footer" effects, or it breaks the storytelling cohesion the rest of
the plan is built on.

**Where each piece comes from:**

| Footer feature | Callback to |
|---|---|
| Facet-seam field background, drawn in on scroll | The `FacetMask` motif, used one last time as texture instead of a media window |
| World clock strip: Toronto / London / Berlin / Sydney / Dublin | The exact cities the Mentorship avatars live in (§7d) |
| Live "students moved" counter | Same count-up mechanic as the Jobs stat counters (§7e), reused for a footer-level number |
| Newsletter success = a checkmark that draws itself | The Visa checklist tick animation (§7b), reused as the "you're in" confirmation |
| "Break the glass" logo easter egg | The seam shatter/reassemble language from Housing (§7c), now literalized as a click interaction |
| Facet-shaped back-to-top button | `FacetMask` variant `compact`, same component, smallest instance on the page |

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  [facet-seam field, faint, full-bleed background]                │
│                                                                    │
│  Global Bridge                          Get the checklist         │
│  Your move, held together.              [email____] [→]           │
│                                          ✓ checklist sent (on success)
│  ── Sitemap ──        ── Company ──      ── Status ──             │
│  01 Visa              About              ● All systems live       │
│  02 Housing           Careers            18,342 bridges built ↑   │
│  03 Mentorship        Press                                       │
│  04 Jobs              Contact            Toronto   14:02          │
│  05 Life Support      Trust & Safety     London    19:02          │
│                                           Berlin    20:02          │
│                                           Sydney    04:02 +1       │
│                                           Dublin    19:02          │
│                                                                    │
│  © Global Bridge          [in] [ig] [x] [yt]        [◆ Back to top]│
└──────────────────────────────────────────────────────────────────┘
```

### 1. Facet-seam field (background)
A large, faint, tiled version of the same seam-line geometry from
`FacetMask` — not clipping any media this time, just decorative structure.
Render 6–8 outline paths at low opacity (`0.06`), randomly scaled/rotated,
absolutely positioned across the footer. On enter (`ScrollTrigger`,
`start: "top 90%"`), each path's `strokeDashoffset` draws from `1 → 0`,
staggered — the footer's floor visibly "cracks into" existence as you
reach it, one final callback before the page ends.

```tsx
// components/footer/FacetField.tsx
const seeds = [
  { d: "M0,0 L1,0.1 L0.9,1 L0,0.8 Z", x: "5%", y: "10%", scale: 0.9, rotate: -8 },
  { d: "M0,0.2 L1,0 L0.8,1 L0,1 Z", x: "70%", y: "5%", scale: 1.1, rotate: 12 },
  // ...6-8 total, hand-varied like the FacetMask variants
];

seeds.map((s) => (
  <svg key={s.x} viewBox="0 0 1 1" style={{ position: "absolute", left: s.x, top: s.y, width: 220, height: 220, transform: `rotate(${s.rotate}deg) scale(${s.scale})` }}>
    <path d={s.d} fill="none" stroke="var(--color-clay-500)" strokeWidth={0.006}
      pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} className="facet-field-seam" />
  </svg>
));
```
```ts
gsap.to(".facet-field-seam", {
  strokeDashoffset: 0, stagger: 0.15, ease: "power1.out",
  scrollTrigger: { trigger: footerRef, start: "top 90%", end: "top 50%", scrub: 0.6 },
});
```

### 2. World clock strip
Five cities, matching the Mentorship avatars exactly — a reader who
noticed those city labels earlier gets a small "oh, it's the same network"
moment. Live local time via `Intl.DateTimeFormat`, ticking every second;
this is the one footer element that runs on a `setInterval`, not scroll —
deliberately, since a clock that only updates on scroll would read as
broken, not clever.

```tsx
const CITIES = [
  { label: "Toronto", tz: "America/Toronto" },
  { label: "London", tz: "Europe/London" },
  { label: "Berlin", tz: "Europe/Berlin" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "Dublin", tz: "Europe/Dublin" },
];

function useLiveClocks() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return CITIES.map((c) => ({
    ...c,
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: c.tz }).format(now),
  }));
}
```
Render each as `facet-label` + mono time, staggering in with `y: 12,
autoAlpha: 0 → 1` on the same footer-enter trigger as the seam field.

### 3. Live "bridges built" counter
Same count-up mechanic as §7e (tween a plain object, write to
`textContent`), but with an extra over-engineered flourish: after the
scroll-triggered count-up finishes, it keeps nudging upward by 1 every
6–14 seconds (randomized interval) with a tiny scale-pulse, so it reads as
a genuinely live figure rather than a one-time animation. Cap the
randomized increments client-side only — this is cosmetic, not real data,
so keep it subtle (never jump by more than 1, never more than once every
few seconds) or it starts to look fake instead of alive.

```ts
function startAmbientTicker(el: HTMLElement, base: number) {
  let val = base;
  const tick = () => {
    val += 1;
    gsap.fromTo(el, { scale: 1.15 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
    el.textContent = val.toLocaleString();
    setTimeout(tick, 6000 + Math.random() * 8000);
  };
  setTimeout(tick, 6000 + Math.random() * 8000);
}
```

### 4. Magnetic sitemap links
Each footer nav link (`01 Visa`, `02 Housing`, …) gets a subtle magnetic
pull toward the cursor on hover, using `gsap.quickTo` for performance
(avoids creating a new tween per `mousemove` frame):

```ts
function magnetize(el: HTMLElement, strength = 0.35) {
  const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
  el.addEventListener("mousemove", (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - r.left - r.width / 2) * strength);
    yTo((e.clientY - r.top - r.height / 2) * strength);
  });
  el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
}
```
Applied to the 5 sitemap links (reuse the `01`–`05` labels from the
sections themselves — same numbering system, same meaning: this list is the
site's table of contents, not a fresh set of links).

### 5. Newsletter → draws its own checkmark on success
The email capture doesn't just show a generic "Subscribed!" toast — on
successful submit, a small inline SVG checkmark draws itself in exactly
like the Visa checklist tick (§7b: `strokeDasharray: 20`, `strokeDashoffset:
20 → 0`), and the copy changes to "Checklist on its way" — tying the
footer's one conversion moment directly back to the product's actual first
feature (the visa checklist) instead of a generic newsletter confirmation.

### 6. "Break the glass" logo easter egg
Clicking the small `Global Bridge` wordmark in the footer triggers the
facet-field seams (§1 above) to snap apart (`strokeDashoffset: 0 → 1`
reversed fast, plus a brief `x/y` jitter on each path, `duration: 0.15`)
and then redraw themselves back in (`duration: 0.6, ease: "elastic.out"`) —
a literal, one-off "shatter and hold together again" moment, gated so it
can only replay once every few seconds (avoid it becoming a spam toy) and
fully skipped under `prefers-reduced-motion`.

### 7. Back-to-top: a `FacetMask`, smallest instance
Reuse `FacetMask` itself one more time — `variant="compact"`, tiny
(40×40px), with a plain up-arrow icon inside instead of media
(`media` prop can stay `"image"` pointed at a 1×1 transparent pixel, or
extend `FacetMask` to optionally accept `children` instead of media for
this one case — cleaner: add an optional `content?: React.ReactNode` prop
to `FacetMask` that renders in place of the video/img when provided).
Appears (`autoAlpha`, `y`) once the user has scrolled past the hero,
magnetized like the sitemap links, and on click calls
`lenis.scrollTo(0, { duration: 1.6 })` — the smooth-scroll instance from
§5, so even this last click stays on the same scroll engine as everything
else on the page.

### Accessibility / restraint notes for this section specifically
- The ambient ticker (§3) and clock (§2) both use `setInterval`, not
  `ScrollTrigger` — confirm neither runs when the tab is backgrounded
  (`document.hidden` check) to avoid wasted cycles.
- The easter egg (§6) is genuinely optional flourish: it must not carry any
  information the user needs, and must be skipped entirely under
  `prefers-reduced-motion: reduce`.
- Despite the "over-engineered" brief, keep the footer's *static* fallback
  (no JS / reduced motion) fully legible: real links, real email input,
  real numbers — none of the above animation is load-bearing for content.

---

## 11. Build order (for whoever implements this)

1. Scaffold Next.js 16 + Tailwind v4 project, drop in `globals.css` (§10)
2. `lib/gsap.ts` + `components/SmoothScroll.tsx`, wire into `app/layout.tsx`
3. `components/FacetMask.tsx` (§3) — test it standalone with one static image
4. `components/Hero.tsx` (§6a) — no animation yet, just layout
5. `components/ServiceSection.tsx` shared entrance only (§7a), rendered for
   Visa/Housing/Jobs with `data/services.ts`
6. `components/ScrollOrchestrator.tsx` (§6c) + the `#section-visa` curtain
   wrapper in `page.tsx` (§6b) — this is the trickiest piece, verify the
   `-mt-[100vh]` / `end: "+=100%"` handoff has no visual jump before moving on
7. Layer in the per-section signature animations: checklist (7b), assemble
   (7c), counters+tilt (7e)
8. `components/MentorshipSection.tsx` (7d)
9. `components/LifeSupportSection.tsx` (7f) — the deliberate quiet section
10. `components/ReviewsSection.tsx` (7g) — needs `data/reviews.ts` (§7g)
11. `components/ClosingCTA.tsx` (7h)
12. `components/footer/*` (§11a) — build the static/legible version first
    (real links, real input, real numbers), then layer in the facet field,
    clocks, ticker, magnetic links, and easter egg on top
13. Accessibility pass (§8): reduced-motion branches, focus states, poster
    images, `ScrollTrigger.refresh()` on load
14. Swap Unsplash placeholders for real photography + drop in the client's
    hero video at `public/video/hero-loop.mp4`
