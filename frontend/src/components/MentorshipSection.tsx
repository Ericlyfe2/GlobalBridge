"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import ScrubTextAnimation from "@/components/ScrubTextAnimation";
import { mentorshipData } from "@/data/services";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { gsap, ScrollTrigger } from "@/lib/gsap";

gsap.registerPlugin(useGSAP);

type Mentor = {
  name: string;
  city: string;
  img: string;
  baseAngle: number; // position on the circle, in degrees (0°=right, 90°=down, 270°=top)
  tilt: number; // fixed photo tilt
};

const MENTORS: Mentor[] = [
  { name: "Amara", city: "Toronto", baseAngle: 200, tilt: -14, img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?q=80&w=400&auto=format&fit=crop" },
  { name: "Priya", city: "London", baseAngle: 245, tilt: 9, img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=400&auto=format&fit=crop" },
  { name: "Kwame", city: "Berlin", baseAngle: 290, tilt: -6, img: "https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=400&auto=format&fit=crop" },
  { name: "Yuki", city: "Sydney", baseAngle: 335, tilt: 8, img: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=400&auto=format&fit=crop" },
  { name: "Diego", city: "Dublin", baseAngle: 20, tilt: -11, img: "https://images.unsplash.com/photo-1549918864-48ac978761a4?q=80&w=400&auto=format&fit=crop" },
  { name: "Noor", city: "Boston", baseAngle: 65, tilt: 15, img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
];

const RADIUS_RATIO = 0.50;
const TOTAL_SPINS = 1.5;
const IDLE_DELAY = 150;

function normalizeAngle(deg: number) {
  return ((deg % 360) + 360) % 360;
}
function angleDiff(a: number, b: number) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

export default function MentorshipSection() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const arcRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dimsRef = useRef({ width: 0, height: 0 });
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCenterIndexRef = useRef<number>(-1);

  useGSAP(() => {
    const root = rootRef.current;
    const arc = arcRef.current;
    if (!root || !arc) return;

    const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = root.querySelectorAll(".reveal-mentorship");
        const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
        const state = { circleOffset: 0, revealProgress: 0 };

        const measure = () => {
          const rect = arc.getBoundingClientRect();
          dimsRef.current = { width: rect.width, height: rect.height };
        };
        measure();
        window.addEventListener("resize", measure);

        // Computes and applies position/rotation/scale/opacity for one card,
        // combining its circle angle with the entrance reveal progress.
        // This is the ONLY place that writes el.style — GSAP never touches
        // these elements' transforms directly, so there's no conflict.
        const renderCard = (el: HTMLDivElement, m: Mentor) => {
          const { width, height } = dimsRef.current;
          if (!width || !height) return 999;

          const radius = width * RADIUS_RATIO;
          const centerY = radius + height * 0.15;
          const angle = m.baseAngle + state.circleOffset;
          const rad = (angle * Math.PI) / 180;
          const x = width / 2 + radius * Math.cos(rad);
          const y = centerY + radius * Math.sin(rad);

          const distFromTop = angleDiff(angle, 270);
          const edgeT = gsap.utils.clamp(0, 1, distFromTop / 90);
          const edgeOpacity = gsap.utils.mapRange(0, 1, 1, 0, edgeT);
          const finalOpacity = edgeOpacity * state.revealProgress;
          const finalScale = state.revealProgress;
          const cardRotation = angle - 270;

          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.opacity = String(finalOpacity);
          el.style.transform = `translate(-50%, -50%) rotate(${cardRotation}deg) scale(${finalScale})`;

          return distFromTop;
        };

        const renderAll = () => {
          let closestIdx = 0;
          let closestDist = Infinity;
          cards.forEach((el, i) => {
            const dist = renderCard(el, MENTORS[i]);
            if (dist < closestDist) {
              closestDist = dist;
              closestIdx = i;
            }
          });
          return closestIdx;
        };

        // Initial paint, pre-scroll, pre-reveal (cards invisible at revealProgress 0).
        renderAll();

        const showLabelFor = (idx: number) => {
          currentCenterIndexRef.current = idx;
        };
        const hideLabel = () => {};

        gsap.set(heading, { autoAlpha: 0, y: 30 });

        // Entrance: tween the plain `state.revealProgress` number, repainting
        // cards on every tick via onUpdate — never animate the DOM directly.
        const revealTl = gsap.timeline({
          scrollTrigger: { trigger: arc, start: "top 80%", toggleActions: "play none none reverse" },
        });
        revealTl
          .to(heading, { autoAlpha: 1, y: 0, stagger: 0.1, ease: "power2.out" }, 0)
          .to(
            state,
            {
              revealProgress: 1,
              duration: 0.9,
              ease: "back.out(1.6)",
              onUpdate: renderAll,
              onComplete: () => showLabelFor(renderAll()),
            },
            0.1
          );

        // Continuous scrub: spins the circle. Same pattern — tween a plain
        // number, repaint manually on every tick.
        const scrollTween = gsap.to(state, {
          circleOffset: 360 * TOTAL_SPINS,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "center center",
            end: "bottom top",
            scrub: 0.25,
            onUpdate: () => {
              hideLabel();
              if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
              idleTimeoutRef.current = setTimeout(() => showLabelFor(renderAll()), IDLE_DELAY);
            },
          },
          onUpdate: renderAll,
        });

        // Ambient float — separate transform (translateY only) so it can't
        // collide with renderAll's writes; applied via a wrapping element.
        cards.forEach((el, i) => {
          gsap.to(el, {
            "--float": "8px",
            duration: 1.6 + i * 0.12,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });

        return () => {
          window.removeEventListener("resize", measure);
          if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
          scrollTween.kill();
        };
      });

      return () => mm.revert();
  }, { scope: rootRef });

  return (
    <section
      ref={rootRef}
      id="mentorship"
      className="relative w-full py-32 md:py-48 bg-cream-50 overflow-hidden text-center"
    >
      <div className="max-w-2xl mx-auto px-6 relative z-10 mb-10">
        <div className="reveal-mentorship flex items-center justify-center gap-4 mb-6">
          <span className="font-mono text-sm tracking-widest text-clay-500">{mentorshipData.index}</span>
          <div className="h-[1px] w-12 bg-clay-500/30" />
          <span className="facet-label">{t(mentorshipData.titleKey)}</span>
        </div>
        <ScrubTextAnimation 
          as="h2"
          text={t(mentorshipData.dekKey)}
          highlightWords={["lived", "message", "away"]}
          className="block font-display text-4xl md:text-5xl lg:text-6xl text-ink-900 leading-tight"
        />
      </div>

      <div ref={arcRef} className="relative w-full max-w-[1000px] mx-auto h-[300px] md:h-[450px] overflow-visible">
        {MENTORS.map((m, i) => (
          <div
            key={m.name}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute w-28 h-28 md:w-48 md:h-48 will-change-transform"
          >
            <div className="w-full h-full shadow-lg">
              <img src={m.img} alt={m.city} className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-[105%] left-0 w-full text-center">
              <span className="text-sm md:text-lg text-ink-500 font-medium tracking-wide opacity-80">{m.city}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6 relative z-10 mt-12">
        <ScrubTextAnimation 
          as="p"
          text={t(mentorshipData.detailKey)}
          highlightWords={["years", "cultural", "events"]}
          className="block text-lg text-ink-600 leading-relaxed mx-auto"
        />
      </div>
    </section>
  );
}