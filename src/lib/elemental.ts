import { analyzePoem, type Theme } from "./themes";
import { topThemeColors } from "./themeColors";
import { hashString } from "./hash";

export type ElementalKind = "rain" | "embers" | "leaves" | "motes" | "smoke";

const ELEMENTAL_THEME: Record<ElementalKind, Theme> = {
  rain: "water",
  embers: "fire",
  leaves: "nature",
  motes: "light",
  smoke: "dark",
};

export type ElementalSpec = {
  seed: number;
  kind: ElementalKind;
  intensity: number;
  speed: number;
  palette: [string, string, string];
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function resolveElemental(poem: string): ElementalSpec {
  const analysis = analyzePoem(poem);
  const { themeScores, stats } = analysis;

  // pick whichever elemental theme scores highest in the poem itself --
  // mentioning rain/water makes it rain, fire makes embers drift, etc.
  let kind: ElementalKind = "motes";
  let topScore = -1;
  for (const k of Object.keys(ELEMENTAL_THEME) as ElementalKind[]) {
    const score = themeScores[ELEMENTAL_THEME[k]];
    if (score > topScore) {
      topScore = score;
      kind = k;
    }
  }

  const total = Object.values(themeScores).reduce((a, b) => a + b, 0) || 1;
  const intensity = clamp(topScore / Math.max(total * 0.35, 1), 0.18, 1);
  const speed = clamp(0.6 + stats.punctuationDensity * 1.2, 0.5, 2);
  const palette = topThemeColors(themeScores, 3) as [string, string, string];

  return { seed: hashString(poem), kind, intensity, speed, palette };
}
