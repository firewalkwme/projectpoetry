import { analyzePoem, type Theme } from "./themes";
import { topThemeColors } from "./themeColors";
import { hashString } from "./hash";

export type CreatureKind = "bird" | "fish";

export type FlockSpec = {
  seed: number;
  kind: CreatureKind;
  count: number;
  speed: number;
  turbulence: number;
  cohesion: number;
  palette: [string, string, string];
};

function sumThemes(scores: Record<Theme, number>, themes: Theme[]): number {
  return themes.reduce((sum, theme) => sum + scores[theme], 0);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildFlockSpec(poem: string): FlockSpec {
  const analysis = analyzePoem(poem);
  const { themeScores, stats } = analysis;
  const seed = hashString(poem);

  const aquatic = sumThemes(themeScores, ["water", "stillness", "loss", "dark"]);
  const aerial = sumThemes(themeScores, ["light", "love", "motion", "nature"]);
  const wild = sumThemes(themeScores, ["fire", "motion", "fragmentation"]);

  const kind: CreatureKind =
    aquatic === aerial ? (seed % 2 === 0 ? "bird" : "fish") : aquatic > aerial ? "fish" : "bird";

  const total = wild + aquatic + aerial || 1;

  const count = clamp(Math.round(6 + stats.lineCount * 0.7), 6, 26);
  const speed = clamp(40 + stats.punctuationDensity * 70, 35, 140);
  const turbulence = clamp(0.3 + (wild / total) * 1.5, 0.3, 1.8);
  const cohesion = clamp(0.7 + ((aquatic + aerial) / total - wild / total) * 0.5, 0.35, 1.3);

  const palette = topThemeColors(themeScores, 3) as [string, string, string];

  return { seed, kind, count, speed, turbulence, cohesion, palette };
}
