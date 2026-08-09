"use client";

/**
 * The WebGL surface Atlas lives on.
 *
 * Imported with `ssr: false` by AtlasStage — three.js touches `document` and
 * `devicePixelRatio` at module scope, so it must never run during SSR. (Same
 * pattern the hero globe already uses.)
 */

import { Canvas } from "@react-three/fiber";
import { AtlasModel, type AtlasModelProps } from "./AtlasModel";
import { MODE_COLOR } from "@/mascot/types";

export default function AtlasCanvas(props: AtlasModelProps) {
  const rim = MODE_COLOR[props.mode];

  return (
    <Canvas
      // Cap DPR at 2 — beyond that the cost is real and the gain isn't visible.
      dpr={[1, 2]}
      // Framed slightly low so the compass pedestal sits in shot without
      // cropping the antenna.
      camera={{ position: [0, -0.15, 4.9], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      // Let R3F throttle itself on weak GPUs instead of dropping frames wholesale.
      performance={{ min: 0.5 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <directionalLight position={[-4, 1, 2]} intensity={0.7} color={rim} />
      {/* Cool underlight so the white shell doesn't go flat at the bottom. */}
      <pointLight position={[0, -2.5, 1.5]} intensity={1.1} color="#7dd3fc" />
      <AtlasModel {...props} />
    </Canvas>
  );
}
