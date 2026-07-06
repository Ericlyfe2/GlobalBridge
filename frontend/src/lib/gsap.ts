"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

// Register once at module load time (safe: "use client" keeps this browser-only)
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);

/** @deprecated Import { gsap, ScrollTrigger } directly instead */
export function useGsapSetup() {
  return { gsap, ScrollTrigger };
}

export { gsap, ScrollTrigger };
