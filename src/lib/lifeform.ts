import { analyzePoem, type Theme } from "./themes";
import { topThemeColors } from "./themeColors";
import { hashString } from "./hash";

export type LifeformSpec = {
  seed: number;
  rootCount: number;
  depth: number;
  forkChance: number;
  curl: number;
  decay: number;
  thickness: number;
  glowDensity: number;
  growthSpeed: number;
  swayAmount: number;
  palette: [string, string, string];
};

function sumThemes(scores: Record<Theme, number>, themes: Theme[]): number {
  return themes.reduce((sum, theme) => sum + scores[theme], 0);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildLifeformSpec(poem: string): LifeformSpec {
  const analysis = analyzePoem(poem);
  const { themeScores, stats } = analysis;

  // three temperaments a poem's content can lean toward, each shaping a
  // different structural quality of the organism that grows from it
  const wild = sumThemes(themeScores, ["fire", "motion", "fragmentation"]);
  const still = sumThemes(themeScores, ["earth", "stillness", "dark"]);
  const luminous = sumThemes(themeScores, ["water", "light", "love"]);
  const total = wild + still + luminous || 1;

  const wildRatio = wild / total;
  const stillRatio = still / total;
  const luminousRatio = luminous / total;

  const forkChance = clamp(0.16 + wildRatio * 0.42, 0.16, 0.58);
  const curl = clamp(0.18 + wildRatio * 0.85, 0.18, 1.0);
  const decay = clamp(0.66 + stillRatio * 0.16, 0.6, 0.82);
  const swayAmount = clamp(0.06 + wildRatio * 0.3, 0.05, 0.4);
  const glowDensity = clamp(0.15 + luminousRatio * 0.7, 0.12, 0.88);

  const depth = clamp(Math.round(4 + stats.lineCount / 3), 4, 9);
  const rootCount = clamp(Math.round(2 + stats.lineCount / 5), 2, 6);
  const thickness = clamp(2 + stats.avgWordLength * 0.45, 2, 6);
  const growthSpeed = clamp(0.6 + stats.punctuationDensity * 1.2, 0.5, 2.0);

  const palette = topThemeColors(themeScores, 3) as [string, string, string];

  return {
    seed: hashString(poem),
    rootCount,
    depth,
    forkChance,
    curl,
    decay,
    thickness,
    glowDensity,
    growthSpeed,
    swayAmount,
    palette,
  };
}
