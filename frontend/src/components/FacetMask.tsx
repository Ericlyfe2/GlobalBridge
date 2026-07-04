"use client";

import { forwardRef } from "react";

export type FacetVariant = "hero" | "shard" | "drift" | "compact" | "wide";

const VARIANTS: Record<
  FacetVariant,
  { outline: string; origin: [number, number]; seams: [number, number][] }
> = {
  hero: {
    outline:
      "M 0.25,0.4 C 0.25,0.2 0.5,0.1 0.6,0.25 C 0.75,0.05 1.0,0.2 0.9,0.45 C 1.0,0.65 0.85,0.9 0.6,0.85 C 0.4,1.0 0.1,0.8 0.2,0.6 C 0.05,0.55 0.1,0.35 0.25,0.4 Z M 0.15,0.85 C 0.18,0.85 0.20,0.87 0.20,0.90 C 0.20,0.93 0.18,0.95 0.15,0.95 C 0.12,0.95 0.10,0.93 0.10,0.90 C 0.10,0.87 0.12,0.85 0.15,0.85 Z M 0.22,0.75 C 0.23,0.75 0.24,0.76 0.24,0.77 C 0.24,0.78 0.23,0.79 0.22,0.79 C 0.21,0.79 0.20,0.78 0.20,0.77 C 0.20,0.76 0.21,0.75 0.22,0.75 Z",
    origin: [0.5, 0.5],
    seams: [],
  },
  shard: {
    outline:
      "M 0.3,0.45 C 0.25,0.15 0.6,0.1 0.65,0.3 C 0.9,0.15 1.0,0.5 0.85,0.7 C 0.9,0.95 0.55,1.0 0.45,0.8 C 0.2,0.95 0.0,0.7 0.15,0.55 C 0.05,0.4 0.15,0.25 0.3,0.45 Z M 0.18,0.88 C 0.21,0.88 0.23,0.90 0.23,0.93 C 0.23,0.96 0.21,0.98 0.18,0.98 C 0.15,0.98 0.13,0.96 0.13,0.93 C 0.13,0.90 0.15,0.88 0.18,0.88 Z M 0.25,0.78 C 0.26,0.78 0.27,0.79 0.27,0.80 C 0.27,0.81 0.26,0.82 0.25,0.82 C 0.24,0.82 0.23,0.81 0.23,0.80 C 0.23,0.79 0.24,0.78 0.25,0.78 Z",
    origin: [0.5, 0.5],
    seams: [],
  },
  drift: {
    outline:
      "M 0.2,0.5 C 0.1,0.2 0.4,0.15 0.5,0.35 C 0.7,0.05 0.95,0.25 0.85,0.5 C 1.0,0.75 0.7,0.95 0.55,0.75 C 0.4,0.95 0.1,0.8 0.2,0.6 C 0.0,0.5 0.05,0.3 0.2,0.5 Z M 0.12,0.82 C 0.15,0.82 0.17,0.84 0.17,0.87 C 0.17,0.90 0.15,0.92 0.12,0.92 C 0.09,0.92 0.07,0.90 0.07,0.87 C 0.07,0.84 0.09,0.82 0.12,0.82 Z M 0.18,0.72 C 0.19,0.72 0.20,0.73 0.20,0.74 C 0.20,0.75 0.19,0.76 0.18,0.76 C 0.17,0.76 0.16,0.75 0.16,0.74 C 0.16,0.73 0.17,0.72 0.18,0.72 Z",
    origin: [0.5, 0.5],
    seams: [],
  },
  compact: {
    outline:
      "M 0.3,0.3 C 0.4,0.0 0.7,0.0 0.8,0.3 C 1.0,0.4 1.0,0.7 0.8,0.8 C 0.7,1.0 0.4,1.0 0.3,0.8 C 0.0,0.7 0.0,0.4 0.3,0.3 Z M 0.2,0.85 C 0.23,0.85 0.25,0.87 0.25,0.90 C 0.25,0.93 0.23,0.95 0.2,0.95 C 0.17,0.95 0.15,0.93 0.15,0.90 C 0.15,0.87 0.17,0.85 0.2,0.85 Z M 0.26,0.78 C 0.27,0.78 0.28,0.79 0.28,0.80 C 0.28,0.81 0.27,0.82 0.26,0.82 C 0.25,0.82 0.24,0.81 0.24,0.80 C 0.24,0.79 0.25,0.78 0.26,0.78 Z",
    origin: [0.5, 0.5],
    seams: [],
  },
  wide: {
    outline:
      "M 0.2,0.4 C 0.3,0.1 0.6,0.1 0.7,0.3 C 0.9,0.2 1.0,0.5 0.9,0.7 C 0.8,0.9 0.5,1.0 0.4,0.8 C 0.2,0.9 0.0,0.7 0.1,0.5 C 0.0,0.3 0.1,0.2 0.2,0.4 Z M 0.1,0.8 C 0.13,0.8 0.15,0.82 0.15,0.85 C 0.15,0.88 0.13,0.9 0.1,0.9 C 0.07,0.9 0.05,0.88 0.05,0.85 C 0.05,0.82 0.07,0.8 0.1,0.8 Z M 0.16,0.7 C 0.17,0.7 0.18,0.71 0.18,0.72 C 0.18,0.73 0.17,0.74 0.16,0.74 C 0.15,0.74 0.14,0.73 0.14,0.72 C 0.14,0.71 0.15,0.7 0.16,0.7 Z",
    origin: [0.5, 0.5],
    seams: [],
  },
};

type BaseProps = { id: string; variant?: FacetVariant; className?: string; glow?: boolean };
type VideoProps = BaseProps & { media: "video"; src: string; poster?: string; content?: never };
type ImageProps = BaseProps & { media: "image"; src: string; alt: string; content?: never };
type ContentProps = BaseProps & { media?: never; content: React.ReactNode };

type FacetMaskProps = VideoProps | ImageProps | ContentProps;

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
        ) : props.media === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="facet-media-el w-full h-full object-cover" src={props.src} alt={props.alt} />
        ) : (
          <div className="facet-media-el w-full h-full flex items-center justify-center bg-slate-900">
            {props.content}
          </div>
        )}
        {props.media && (
          <div
            className="absolute inset-0 mix-blend-multiply opacity-30 pointer-events-none"
            style={{ background: "linear-gradient(150deg, var(--color-sky-600) 0%, transparent 40%, var(--color-clay-700) 100%)" }}
            aria-hidden="true"
          />
        )}
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
