"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

export default function AirplanePath() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const airplaneRef = useRef<HTMLImageElement>(null);
  const [pathData, setPathData] = useState<string>("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const masksRef = useRef<HTMLElement[]>([]);
  const ratiosRef = useRef<number[]>([]);

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current) return;

      const wrapper = containerRef.current.parentElement;
      if (!wrapper) return;
      const wrapperWidth = wrapper.offsetWidth;
      const wrapperHeight = wrapper.offsetHeight;

      const getOffset = (el: HTMLElement) => {
        let x = 0;
        let y = 0;
        let current: HTMLElement | null = el;
        while (current && current !== wrapper && current !== document.body) {
          x += current.offsetLeft;
          y += current.offsetTop;
          current = current.offsetParent as HTMLElement;
        }
        return { x, y };
      };

      // Find all elements we want the plane to visit within this container
      const masks = Array.from(wrapper.querySelectorAll('.facet-mask'));

      if (masks.length === 0) return;

      const points = masks.map(mask => {
        const { x, y } = getOffset(mask as HTMLElement);
        return {
          x: x + (mask as HTMLElement).offsetWidth / 2,
          y: y + (mask as HTMLElement).offsetHeight / 2
        };
      });

      // Save masks and calculate their ratios for the scroll trigger
      masksRef.current = masks as HTMLElement[];
      ratiosRef.current = points.map(p => Math.max(0, p.y / wrapperHeight));

      const startPoint = { x: wrapperWidth / 2, y: 0 };
      const endPoint = { x: wrapperWidth / 2, y: wrapperHeight + 300 };

      const allPoints = [startPoint, ...points, endPoint];

      let d = `M ${allPoints[0].x} ${allPoints[0].y}`;
      for (let i = 1; i < allPoints.length; i++) {
        const p0 = allPoints[i - 1];
        const p1 = allPoints[i];

        // Cubic bezier to make it "snake" vertically
        const cp1x = p0.x;
        const cp1y = p0.y + (p1.y - p0.y) / 2;
        const cp2x = p1.x;
        const cp2y = p0.y + (p1.y - p0.y) / 2;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }

      setPathData(d);
      setDimensions({ width: wrapperWidth, height: wrapperHeight });
    };

    updatePath();
    window.addEventListener("resize", updatePath);

    // Slight delay to ensure layout (like images loading) is done
    const timer = setTimeout(updatePath, 500);

    return () => {
      window.removeEventListener("resize", updatePath);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!pathData || !pathRef.current || !airplaneRef.current) return;

    const wrapper = containerRef.current?.parentElement;
    if (!wrapper) return;

    const path = pathRef.current;
    // totalLength used only to keep the reference alive; no draw animation needed
    path.getTotalLength();

    const mm = gsap.matchMedia(containerRef);

    mm.add({
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)"
    }, (context) => {
      const { isDesktop } = context.conditions as { isDesktop: boolean };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onEnter: () => gsap.to(airplaneRef.current, { autoAlpha: 1, duration: 0.3 }),
          onLeaveBack: () => gsap.to(airplaneRef.current, { autoAlpha: 0, duration: 0.3 }),
          onUpdate: (self) => {
            const prog = self.progress;
            masksRef.current.forEach((mask, i) => {
              const ratio = ratiosRef.current[i];
              const isRevealed = mask.dataset.revealed === "true";
              if (prog >= ratio && !isRevealed) {
                mask.dataset.revealed = "true";
                gsap.to(mask, { autoAlpha: 1, scale: 1, ease: "back.out(1.5)", duration: 0.5 });
              } else if (prog < ratio && isRevealed) {
                mask.dataset.revealed = "false";
                gsap.to(mask, { autoAlpha: 0, scale: 0, duration: 0.3 });
              }
            });
          },
        },
      });

      if (isDesktop) {
        // Airplane motion along the SVG path
        tl.to(
          airplaneRef.current!,
          {
            motionPath: {
              path: pathRef.current!,
              align: pathRef.current!,
              alignOrigin: [0.5, 0.5],
              autoRotate: true,
            },
            ease: "none",
          },
          0
        );
      } else {
        gsap.set(containerRef.current, { autoAlpha: 0 });
      }
    });

    return () => mm.revert();
  }, [pathData, dimensions]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {dimensions.width > 0 && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          {/* Path starts invisible; strokeDashoffset is animated to 0 via GSAP */}
          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="var(--color-clay-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="12 18"
            opacity={0.18}
          />
        </svg>
      )}
      <img
        ref={airplaneRef}
        src="/airplane-emerald.svg"
        alt="Airplane"
        className="absolute w-24 h-24 z-50 -ml-12 -mt-12 opacity-0 invisible"
      />
    </div>
  );
}
