import type { Mood } from "./moods";

export type ShapeCharacter = {
  jaggedness: number; // 0 smooth edge -- 1 spiky/irregular edge
  erraticism: number; // 0 calm motion -- 1 jumpy/erratic motion
  bounce: number; // pulsing amplitude (joyful/romantic "bounciness")
  speedMul: number; // overall idle-motion speed multiplier
  // 0 positive/calm .. 1 intense-negative. drives fractal depth + chaos:
  // intense negative moods recurse deeper and more wildly
  negativity: number;
  // color the fractal tips shift toward as they recurse outward --
  // negative moods go cold/sickly (violet, bruised teal), positive moods
  // go warm (gold, amber)
  tip: [number, number, number];
};

// mood drives more than color: it shapes how each cluster's edges look,
// how erratically/fluidly everything moves, and how its fractals grow
export const MOOD_SHAPE: Record<Mood, ShapeCharacter> = {
  joyful: { jaggedness: 0.15, erraticism: 0.35, bounce: 0.22, speedMul: 1.35, negativity: 0.15, tip: [240, 200, 90] },
  melancholic: { jaggedness: 0.12, erraticism: 0.15, bounce: 0.03, speedMul: 0.5, negativity: 0.6, tip: [90, 150, 150] },
  angry: { jaggedness: 0.6, erraticism: 0.85, bounce: 0.08, speedMul: 1.7, negativity: 0.85, tip: [165, 85, 130] },
  calm: { jaggedness: 0.08, erraticism: 0.1, bounce: 0.04, speedMul: 0.45, negativity: 0.1, tip: [180, 220, 210] },
  romantic: { jaggedness: 0.12, erraticism: 0.2, bounce: 0.12, speedMul: 0.65, negativity: 0.25, tip: [235, 150, 130] },
  fearful: { jaggedness: 0.42, erraticism: 0.75, bounce: 0.05, speedMul: 1.05, negativity: 0.95, tip: [135, 90, 195] },
  neutral: { jaggedness: 0.2, erraticism: 0.25, bounce: 0.06, speedMul: 0.8, negativity: 0.3, tip: [200, 185, 160] },
};
