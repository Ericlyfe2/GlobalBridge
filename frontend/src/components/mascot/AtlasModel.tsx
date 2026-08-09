"use client";

/**
 * Atlas, built from real geometry.
 *
 * Everything that carries meaning in the brand art is a separately animated
 * part, because each one is doing a job:
 *   - face screen → the emotional system (canvas texture, see face.ts)
 *   - cape        → physical personality; flows harder when excited
 *   - compass     → the navigator identity; spins toward a new destination
 *   - aura        → mode colour, so guardian/discoverer read at a glance
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MascotEmotion, MascotMode } from "@/mascot/types";
import { MODE_COLOR, ATLAS_PALETTE } from "@/mascot/types";
import { drawFace, isAnimatedFace, FACE_SIZE } from "./face";

// Canonical palette — see frontend/public/mascot/atlas-character-sheet.png
const SHELL = ATLAS_PALETTE.shell;
const SHELL_DARK = ATLAS_PALETTE.shellDark;
const GOLD = ATLAS_PALETTE.gold;
const CAPE = ATLAS_PALETTE.navy;

/**
 * Per-emotion motion energy — drives bob height, cape flow and spin speed.
 * Guardian states sit LOW on purpose: stillness is the alarm signal, not motion
 * (docs/MASCOT.md Part 12).
 */
const ENERGY: Record<MascotEmotion, number> = {
  idle: 1, happy: 1.2, excited: 1.9, thinking: 0.7, scanning: 0.4,
  concerned: 0.5, alert: 0.15, celebrating: 2.4, proud: 1.3,
  confused: 0.9, serious: 0.1, surprised: 1.7, winking: 1.25,
};

export type AtlasModelProps = {
  emotion: MascotEmotion;
  mode: MascotMode;
  /** Horizontal travel across the scene, -1 (left) → 1 (right). */
  travel?: number;
  /** Let Atlas turn toward the cursor. */
  followPointer?: boolean;
  /** Disable all idle motion for prefers-reduced-motion. */
  reducedMotion?: boolean;
};

export function AtlasModel({
  emotion, mode, travel = 0, followPointer = true, reducedMotion = false,
}: AtlasModelProps) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const capeRef = useRef<THREE.Mesh>(null);
  const compass = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);

  const accent = MODE_COLOR[mode];
  const energy = ENERGY[emotion] ?? 1;

  // ── Face screen texture ────────────────────────────────────────────────
  const face = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = FACE_SIZE;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, ctx, texture };
  }, []);

  // Blink/repaint bookkeeping kept in a ref so it never triggers React renders.
  const anim = useRef({ blink: 0, nextBlink: 2, elapsed: 0, lastEmotion: "" as string, dirty: true });

  // Cape rest positions, captured once so the wave is applied to the original
  // shape each frame rather than compounding.
  const capeRest = useRef<Float32Array | null>(null);

  useFrame((state, delta) => {
    const a = anim.current;
    a.elapsed += delta;
    const t = a.elapsed;

    // ── Blinking: a short close, then a randomised pause ────────────────
    if (!reducedMotion) {
      a.nextBlink -= delta;
      if (a.nextBlink <= 0) {
        a.blink = Math.min(1, a.blink + delta * 14);
        if (a.blink >= 1) {
          a.nextBlink = 2.4 + Math.random() * 3.4;
          a.blink = 1;
        }
        a.dirty = true;
      } else if (a.blink > 0) {
        a.blink = Math.max(0, a.blink - delta * 12);
        a.dirty = true;
      }
    }

    if (a.lastEmotion !== emotion) {
      a.lastEmotion = emotion;
      a.dirty = true;
    }

    // Repaint only when something actually changed, or continuously for
    // emotions that animate (the scanning sweep).
    if (a.dirty || isAnimatedFace(emotion)) {
      drawFace(face.ctx, emotion, accent, a.blink, t);
      face.texture.needsUpdate = true;
      a.dirty = false;
    }

    if (reducedMotion) {
      if (root.current) root.current.position.set(travel * 3.1, 0, 0);
      return;
    }

    // ── Float + travel ──────────────────────────────────────────────────
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.5) * 0.09 * energy;
      // Ease toward the target x so scroll-driven travel feels weighted.
      const targetX = travel * 3.1;
      root.current.position.x += (targetX - root.current.position.x) * Math.min(1, delta * 3);
      root.current.rotation.z = Math.sin(t * 1.1) * 0.035 * energy;
      // Lean into the direction of travel.
      root.current.rotation.y = THREE.MathUtils.lerp(
        root.current.rotation.y, travel * 0.42, Math.min(1, delta * 3),
      );
    }

    // ── Head follows the cursor ─────────────────────────────────────────
    if (head.current) {
      const px = followPointer ? state.pointer.x : 0;
      const py = followPointer ? state.pointer.y : 0;
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, px * 0.42, Math.min(1, delta * 4));
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -py * 0.26, Math.min(1, delta * 4));
      // Curious tilt when thinking or confused.
      const tilt = emotion === "thinking" || emotion === "confused" ? 0.2 : 0;
      head.current.rotation.z = THREE.MathUtils.lerp(head.current.rotation.z, tilt, Math.min(1, delta * 3));
    }

    // ── Cape: travelling sine wave, stronger with energy ────────────────
    const cape = capeRef.current;
    if (cape) {
      const pos = cape.geometry.attributes.position as THREE.BufferAttribute;
      if (!capeRest.current) capeRest.current = Float32Array.from(pos.array as Float32Array);
      const rest = capeRest.current;
      for (let i = 0; i < pos.count; i++) {
        const ix = i * 3;
        const x = rest[ix];
        const y = rest[ix + 1];
        // Amplitude grows toward the free (lower) edge so the top stays pinned.
        const drop = (0.55 - y) * 0.55;
        pos.array[ix + 2] = rest[ix + 2]
          + Math.sin(t * 2.6 + y * 3.4 + x * 1.8) * 0.13 * drop * energy;
      }
      pos.needsUpdate = true;
      cape.geometry.computeVertexNormals();
    }

    // ── Compass: idles slowly, spins up when navigating ─────────────────
    if (compass.current) {
      const speed = mode === "navigator" ? 1.5 : 0.35;
      compass.current.rotation.y += delta * speed * energy;
    }

    // ── Aura pulse ──────────────────────────────────────────────────────
    if (auraRef.current) {
      const s = 1 + Math.sin(t * 2.2) * 0.05 * energy;
      auraRef.current.scale.setScalar(s);
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 2.2) * 0.045 * energy;
    }

    // ── Arms: celebrating throws them up, alert pulls them in ───────────
    const armUp = emotion === "celebrating" || emotion === "excited" ? -0.9 : 0;
    if (leftArm.current) {
      leftArm.current.rotation.z = THREE.MathUtils.lerp(
        leftArm.current.rotation.z, 0.42 + armUp, Math.min(1, delta * 4),
      );
    }
    if (rightArm.current) {
      rightArm.current.rotation.z = THREE.MathUtils.lerp(
        rightArm.current.rotation.z, -0.42 - armUp, Math.min(1, delta * 4),
      );
    }
  });

  return (
    <group ref={root} dispose={null}>
      {/* Mode-coloured aura — the fastest read of guardian vs discoverer. */}
      <mesh ref={auraRef} position={[0, 0.15, -0.35]}>
        <sphereGeometry args={[1.15, 24, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* ── Cape ─────────────────────────────────────────────────────── */}
      <mesh ref={capeRef} position={[0, 0.1, -0.34]} rotation={[0.12, 0, 0]}>
        <planeGeometry args={[1.15, 1.35, 16, 16]} />
        <meshStandardMaterial
          color={CAPE} side={THREE.DoubleSide} roughness={0.62} metalness={0.12}
        />
      </mesh>
      {/* Gold trim along the cape's shoulder line */}
      <mesh position={[0, 0.7, -0.3]} rotation={[0.12, 0, 0]}>
        <planeGeometry args={[1.16, 0.1]} />
        <meshStandardMaterial color={GOLD} side={THREE.DoubleSide} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Globe emblem on the cape */}
      <mesh position={[0.34, 0.44, -0.27]} rotation={[0.12, 0, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <mesh position={[0, -0.28, 0]} castShadow>
        <capsuleGeometry args={[0.37, 0.3, 8, 24]} />
        <meshStandardMaterial color={SHELL} roughness={0.28} metalness={0.42} />
      </mesh>
      {/* Chest light — pulses with the mode colour */}
      <mesh position={[0, -0.2, 0.34]}>
        <circleGeometry args={[0.1, 20]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      {/* Arms */}
      <mesh ref={leftArm} position={[-0.42, -0.24, 0.04]} rotation={[0, 0, 0.42]}>
        <capsuleGeometry args={[0.075, 0.26, 6, 14]} />
        <meshStandardMaterial color={SHELL_DARK} roughness={0.32} metalness={0.5} />
      </mesh>
      <mesh ref={rightArm} position={[0.42, -0.24, 0.04]} rotation={[0, 0, -0.42]}>
        <capsuleGeometry args={[0.075, 0.26, 6, 14]} />
        <meshStandardMaterial color={SHELL_DARK} roughness={0.32} metalness={0.5} />
      </mesh>

      {/* ── Head ─────────────────────────────────────────────────────── */}
      <group ref={head} position={[0, 0.42, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.52, 32, 32]} />
          <meshStandardMaterial color={SHELL} roughness={0.22} metalness={0.45} />
        </mesh>

        {/* The face screen. The rounded-rect screen, gold bezel and blush are all
            painted into the texture (face.ts), so this is a simple plane. */}
        <mesh position={[0, 0.02, 0.45]}>
          <planeGeometry args={[0.74, 0.74]} />
          <meshBasicMaterial map={face.texture} toneMapped={false} transparent />
        </mesh>

        {/* Gold ear discs with navy centres, per the canonical sheet */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.09, 24]} />
              <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.75} />
            </mesh>
            <mesh position={[0, side * 0.05, 0]}>
              <cylinderGeometry args={[0.095, 0.095, 0.06, 24]} />
              <meshStandardMaterial color={ATLAS_PALETTE.navyDeep} roughness={0.45} metalness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Antenna with a mode-coloured tip */}
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.017, 0.017, 0.2, 8]} />
          <meshStandardMaterial color={SHELL_DARK} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.69, 0]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>

      {/* ── Compass pedestal — the navigator identity ──────────────────
          Canon shows a large disc he floats *above*: direction is what he
          stands on, not an accessory he carries (docs/MASCOT.md Part 1 §10). */}
      <group ref={compass} position={[0, -1.05, 0]}>
        {/* Brushed steel disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.92, 0.92, 0.055, 48]} />
          <meshStandardMaterial color={SHELL_DARK} metalness={0.85} roughness={0.32} />
        </mesh>
        {/* Glowing rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.92, 0.03, 12, 56]} />
          <meshStandardMaterial
            color={accent} emissive={accent} emissiveIntensity={1.7}
            toneMapped={false} metalness={0.6} roughness={0.25}
          />
        </mesh>
        {/* Inner ring detail */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
          <torusGeometry args={[0.62, 0.012, 8, 48]} />
          <meshStandardMaterial color={ATLAS_PALETTE.navy} metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Four cardinal points. Each sits in its own rotated group so the
            cone is pushed outward along that group's +Z, rather than all four
            collapsing onto the origin. North is accented. */}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (Math.PI / 2) * i, 0]}>
            <mesh position={[0, 0.05, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.13, 0.6, 4]} />
              <meshStandardMaterial
                // North is emphasised in deeper blue, per the sheet.
                color={i === 0 ? ATLAS_PALETTE.navy : SHELL}
                metalness={0.8} roughness={0.28}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
