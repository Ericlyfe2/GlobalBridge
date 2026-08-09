/**
 * Atlas's face screen.
 *
 * The head is a *display*, so expression is software rather than geometry — one model carries the
 * whole emotional range with no morph targets. See docs/MASCOT.md Part 1 §2.
 *
 * Canonical reference: frontend/public/mascot/atlas-character-sheet.png
 *   - rounded-rectangle screen, not a circle
 *   - large rounded-square cyan eyes with a bright catch-light (the aliveness cue)
 *   - small mouth with a warm pink interior
 *   - blush present in EVERY state, including alert — it is what keeps him warm rather than
 *     frightening when he escalates (Part 12)
 *
 * Canvas is 256×256; all coordinates below are in that space.
 */

import type { MascotEmotion } from "@/mascot/types";
import { ATLAS_PALETTE } from "@/mascot/types";

export const FACE_SIZE = 256;

type EyeShape =
  | "oval" | "arc" | "wide" | "narrow" | "angry" | "star" | "side" | "round";

type FaceSpec = {
  eye: EyeShape;
  /** Mouth curvature: >0 smiles, <0 frowns, 0 flat. */
  mouth: number;
  /** Mouth is drawn as a filled open shape rather than a stroked line. */
  openMouth?: boolean;
  /** Vertical eye offset — droops when concerned/sad. */
  eyeY: number;
  /** Horizontal pupil drift, for "looking away" while thinking. */
  gaze: number;
  scan?: boolean;
  /** Right eye closes into an arc while the left stays open. */
  wink?: boolean;
  /** Left/right eye asymmetry, for confusion. */
  lopsided?: boolean;
};

const FACES: Record<MascotEmotion, FaceSpec> = {
  idle:        { eye: "oval",   mouth: 0.3,  eyeY: 0,  gaze: 0 },
  happy:       { eye: "arc",    mouth: 0.75, eyeY: 0,  gaze: 0, openMouth: true },
  excited:     { eye: "wide",   mouth: 1.0,  eyeY: -2, gaze: 0, openMouth: true },
  thinking:    { eye: "side",   mouth: 0.1,  eyeY: -2, gaze: 9 },
  scanning:    { eye: "narrow", mouth: 0.05, eyeY: 0,  gaze: 0, scan: true },
  concerned:   { eye: "oval",   mouth: -0.4, eyeY: 5,  gaze: 0 },
  alert:       { eye: "angry",  mouth: -0.15, eyeY: 0, gaze: 0 },
  celebrating: { eye: "star",   mouth: 1.1,  eyeY: -3, gaze: 0, openMouth: true },
  proud:       { eye: "arc",    mouth: 0.55, eyeY: -1, gaze: 0 },
  confused:    { eye: "oval",   mouth: 0.0,  eyeY: 2,  gaze: -7, lopsided: true },
  serious:     { eye: "narrow", mouth: 0.0,  eyeY: 0,  gaze: 0 },
  surprised:   { eye: "round",  mouth: 0.0,  eyeY: -3, gaze: 0, openMouth: true },
  winking:     { eye: "oval",   mouth: 0.6,  eyeY: 0,  gaze: 0, wink: true },
};

/** Rounded rectangle path helper (the screen and its bezel). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  shape: EyeShape,
  blink: number,      // 0 open → 1 closed
  gaze: number,
  color: string,
  scale = 1,
) {
  const openness = 1 - blink;
  ctx.save();
  ctx.translate(x + gaze, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // A blinking eye collapses to a line whatever its shape.
  if (openness < 0.12) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }

  /** Catch-light — what makes the eye read as alive rather than as a lamp. */
  const catchLight = (dx: number, dy: number, r: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(dx, dy * openness, r, r * openness, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (shape) {
    case "arc": {
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 7, 18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case "wide": {
      roundRect(ctx, -20, -22 * openness, 40, 44 * openness, 12);
      ctx.fill();
      catchLight(7, -8, 5.5);
      break;
    }
    case "round": { // surprised — full circles, maximum catch-light
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 20 * openness, 0, 0, Math.PI * 2);
      ctx.fill();
      catchLight(7, -7, 6.5);
      break;
    }
    case "narrow": {
      roundRect(ctx, -20, -7 * openness, 40, 14 * openness, 6);
      ctx.fill();
      break;
    }
    case "angry": {
      // Sharp inward-angled wedge — focused, never cruel.
      ctx.beginPath();
      ctx.moveTo(-20, -9);
      ctx.lineTo(20, 1);
      ctx.lineTo(20, 14 * openness);
      ctx.lineTo(-20, 7 * openness);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 22 : 9;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r * openness;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "side":
    case "oval":
    default: {
      // Canonical resting eye: rounded square, not a circle.
      roundRect(ctx, -17, -19 * openness, 34, 38 * openness, 11);
      ctx.fill();
      catchLight(6, -7, 4.8);
      break;
    }
  }
  ctx.restore();
}

/** Soft cheek blush. Present in every state — see docs/MASCOT.md Part 12. */
function drawBlush(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
  g.addColorStop(0, "rgba(247,155,176,0.55)");
  g.addColorStop(1, "rgba(247,155,176,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 20, 13, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paint one frame of the face.
 *
 * @param time seconds — drives the scanning sweep
 * @param blink 0 open → 1 closed
 */
export function drawFace(
  ctx: CanvasRenderingContext2D,
  emotion: MascotEmotion,
  color: string,
  blink: number,
  time: number,
) {
  const spec = FACES[emotion] ?? FACES.idle;
  const S = FACE_SIZE;

  ctx.clearRect(0, 0, S, S);

  // ── Screen: rounded rectangle, near-black so emissive glyphs read as backlit ──
  ctx.fillStyle = ATLAS_PALETTE.navyDeep;
  roundRect(ctx, 10, 22, S - 20, S - 60, 46);
  ctx.fill();

  // Faint scanlines so it reads as a display.
  ctx.save();
  roundRect(ctx, 10, 22, S - 20, S - 60, 46);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.028)";
  for (let y = 22; y < S - 38; y += 4) ctx.fillRect(10, y, S - 20, 1);
  ctx.restore();

  // Gold bezel framing the screen — drawn into the texture rather than modelled,
  // because the canonical bezel is a rounded rectangle, not a ring.
  ctx.strokeStyle = ATLAS_PALETTE.gold;
  ctx.lineWidth = 7;
  roundRect(ctx, 10, 22, S - 20, S - 60, 46);
  ctx.stroke();

  const cy = S / 2 - 12 + spec.eyeY;
  const lx = S / 2 - 46;
  const rx = S / 2 + 46;

  // ── Blush sits under the glow, behind the features ──
  drawBlush(ctx, lx - 12, cy + 52);
  drawBlush(ctx, rx + 12, cy + 52);

  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  // ── Eyes ──
  const leftScale = spec.lopsided ? 1.15 : 1;
  const rightScale = spec.lopsided ? 0.82 : 1;
  drawEye(ctx, lx, cy, spec.eye, blink, spec.gaze, color, leftScale);
  // A wink closes the right eye into an arc while the left stays open.
  drawEye(ctx, rx, cy, spec.wink ? "arc" : spec.eye, spec.wink ? 0 : blink, spec.gaze, color, rightScale);

  // ── Mouth ──
  const my = S / 2 + 56;
  if (spec.openMouth && spec.mouth > 0.2) {
    // Filled open smile with the canonical warm interior.
    const w = 20 + spec.mouth * 16;
    const h = 12 + spec.mouth * 16;
    ctx.shadowBlur = 8;
    ctx.fillStyle = ATLAS_PALETTE.mouth;
    ctx.beginPath();
    ctx.moveTo(-w + S / 2, my - h * 0.25);
    ctx.quadraticCurveTo(S / 2, my + h, w + S / 2, my - h * 0.25);
    ctx.quadraticCurveTo(S / 2, my - h * 0.55, -w + S / 2, my - h * 0.25);
    ctx.closePath();
    ctx.fill();
  } else if (spec.openMouth) {
    // Surprised — small round "o".
    ctx.shadowBlur = 8;
    ctx.fillStyle = ATLAS_PALETTE.mouth;
    ctx.beginPath();
    ctx.ellipse(S / 2, my, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (Math.abs(spec.mouth) < 0.03) {
      ctx.moveTo(S / 2 - 20, my);
      ctx.lineTo(S / 2 + 20, my);
    } else {
      ctx.moveTo(S / 2 - 26, my);
      ctx.quadraticCurveTo(S / 2, my + spec.mouth * 34, S / 2 + 26, my);
    }
    ctx.stroke();
  }

  // ── Scanning sweep ──
  if (spec.scan) {
    ctx.save();
    roundRect(ctx, 10, 22, S - 20, S - 60, 46);
    ctx.clip();
    const y = ((time * 110) % (S + 60)) - 30;
    const grad = ctx.createLinearGradient(0, y - 22, 0, y + 22);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 22, S, 44);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = 0;
}

/** Emotions whose face changes every frame (so we only repaint when needed). */
export function isAnimatedFace(emotion: MascotEmotion): boolean {
  return FACES[emotion]?.scan === true;
}
