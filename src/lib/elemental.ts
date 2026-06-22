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

export type ElementalKindConfig = {
  gravityX: number;
  gravityY: number;
  jitter: number;
  baseCount: number;
  sizeMin: number;
  sizeMax: number;
  shape: "line" | "circle" | "leaf" | "blob";
  glow: boolean;
};

export const ELEMENTAL_KIND_CONFIG: Record<ElementalKind, ElementalKindConfig> = {
  rain: { gravityX: 25, gravityY: 420, jitter: 8, baseCount: 160, sizeMin: 8, sizeMax: 18, shape: "line", glow: false },
  embers: { gravityX: 0, gravityY: -45, jitter: 22, baseCount: 70, sizeMin: 1.5, sizeMax: 3.2, shape: "circle", glow: true },
  leaves: { gravityX: 18, gravityY: 55, jitter: 30, baseCount: 36, sizeMin: 5, sizeMax: 9, shape: "leaf", glow: false },
  motes: { gravityX: 0, gravityY: -10, jitter: 16, baseCount: 50, sizeMin: 1.5, sizeMax: 3, shape: "circle", glow: true },
  smoke: { gravityX: 6, gravityY: -22, jitter: 8, baseCount: 22, sizeMin: 30, sizeMax: 60, shape: "blob", glow: false },
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
