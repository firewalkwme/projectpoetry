import type { Mood } from "./moods";

export type MoodPhysics = {
  speed: number;
  turbulence: number;
  biasY: number;
  edgeMode: "bounce" | "wrapY";
  dartChance: number;
  dartStrength: number;
};

export function getMoodPhysics(mood: Mood): MoodPhysics {
  switch (mood) {
    case "joyful":
      return {
        speed: 55,
        turbulence: 2.6,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0,
        dartStrength: 0,
      };
    case "angry":
      return {
        speed: 85,
        turbulence: 4.5,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0.01,
        dartStrength: 140,
      };
    case "melancholic":
      return {
        speed: 16,
        turbulence: 1.4,
        biasY: 7,
        edgeMode: "wrapY",
        dartChance: 0,
        dartStrength: 0,
      };
    case "fearful":
      return {
        speed: 22,
        turbulence: 2.2,
        biasY: 4,
        edgeMode: "bounce",
        dartChance: 0.015,
        dartStrength: 160,
      };
    case "calm":
      return {
        speed: 10,
        turbulence: 0.6,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0,
        dartStrength: 0,
      };
    case "romantic":
      return {
        speed: 13,
        turbulence: 0.8,
        biasY: -6,
        edgeMode: "wrapY",
        dartChance: 0,
        dartStrength: 0,
      };
    default:
      return {
        speed: 12,
        turbulence: 1,
        biasY: 0,
        edgeMode: "bounce",
        dartChance: 0,
        dartStrength: 0,
      };
  }
}
