import type { Mood } from "./moods";

export type MoodPhysics = {
  speed: number;
  turbulence: number;
  biasY: number;
  edgeMode: "bounce" | "wrapY";
  dartChance: number;
  dartStrength: number;
  initialAngleCenter: number;
  initialAngleSpread: number;
};

const FULL_SPREAD = Math.PI * 2;

export function getMoodPhysics(mood: Mood): MoodPhysics {
  switch (mood) {
    case "joyful":
      return {
        speed: 95,
        turbulence: 4.2,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0.004,
        dartStrength: 100,
        initialAngleCenter: 0,
        initialAngleSpread: FULL_SPREAD,
      };
    case "angry":
      return {
        speed: 130,
        turbulence: 7,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0.02,
        dartStrength: 200,
        initialAngleCenter: 0,
        initialAngleSpread: FULL_SPREAD,
      };
    case "melancholic":
      // rainfall: fast, mostly-straight downward fall with minimal sway
      return {
        speed: 130,
        turbulence: 0.25,
        biasY: 90,
        edgeMode: "wrapY",
        dartChance: 0,
        dartStrength: 0,
        initialAngleCenter: Math.PI / 2,
        initialAngleSpread: 0.25,
      };
    case "fearful":
      return {
        speed: 45,
        turbulence: 3.6,
        biasY: 5,
        edgeMode: "bounce",
        dartChance: 0.025,
        dartStrength: 190,
        initialAngleCenter: 0,
        initialAngleSpread: FULL_SPREAD,
      };
    case "calm":
      return {
        speed: 20,
        turbulence: 1.2,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0,
        dartStrength: 0,
        initialAngleCenter: 0,
        initialAngleSpread: FULL_SPREAD,
      };
    case "romantic":
      return {
        speed: 26,
        turbulence: 1.4,
        biasY: -8,
        edgeMode: "wrapY",
        dartChance: 0,
        dartStrength: 0,
        initialAngleCenter: -Math.PI / 2,
        initialAngleSpread: 0.8,
      };
    default:
      return {
        speed: 24,
        turbulence: 1.8,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0.003,
        dartStrength: 60,
        initialAngleCenter: 0,
        initialAngleSpread: FULL_SPREAD,
      };
  }
}
