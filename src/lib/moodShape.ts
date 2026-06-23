import type { Mood } from "./moods";

export type ShapeCharacter = {
  jaggedness: number; // 0 smooth edge -- 1 spiky/irregular edge
  erraticism: number; // 0 calm motion -- 1 jumpy/erratic motion
  bounce: number; // pulsing amplitude (joyful/romantic "bounciness")
  speedMul: number; // overall idle-motion speed multiplier
};

// mood drives more than color: it shapes how each cluster's edges look
// and how erratically/fluidly everything moves
export const MOOD_SHAPE: Record<Mood, ShapeCharacter> = {
  joyful: { jaggedness: 0.15, erraticism: 0.35, bounce: 0.22, speedMul: 1.35 },
  melancholic: { jaggedness: 0.12, erraticism: 0.15, bounce: 0.03, speedMul: 0.5 },
  angry: { jaggedness: 0.6, erraticism: 0.85, bounce: 0.08, speedMul: 1.7 },
  calm: { jaggedness: 0.08, erraticism: 0.1, bounce: 0.04, speedMul: 0.45 },
  romantic: { jaggedness: 0.12, erraticism: 0.2, bounce: 0.12, speedMul: 0.65 },
  fearful: { jaggedness: 0.42, erraticism: 0.75, bounce: 0.05, speedMul: 1.05 },
  neutral: { jaggedness: 0.2, erraticism: 0.25, bounce: 0.06, speedMul: 0.8 },
};
