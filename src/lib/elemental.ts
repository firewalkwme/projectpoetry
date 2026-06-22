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
  rain: { gravityX: 30, gravityY: 480, jitter: 10, baseCount: 220, sizeMin: 14, sizeMax: 30, shape: "line", glow: false },
  embers: { gravityX: 0, gravityY: -50, jitter: 26, baseCount: 90, sizeMin: 2.5, sizeMax: 5.5, shape: "circle", glow: true },
  leaves: { gravityX: 22, gravityY: 65, jitter: 35, baseCount: 48, sizeMin: 10, sizeMax: 18, shape: "leaf", glow: false },
  motes: { gravityX: 0, gravityY: -12, jitter: 18, baseCount: 70, sizeMin: 2.5, sizeMax: 5, shape: "circle", glow: true },
  smoke: { gravityX: 8, gravityY: -26, jitter: 10, baseCount: 30, sizeMin: 45, sizeMax: 85, shape: "blob", glow: false },
};

export const ELEMENTAL_LABEL: Record<ElementalKind, string> = {
  rain: "rain",
  embers: "embers",
  leaves: "falling leaves",
  motes: "drifting light",
  smoke: "smoke",
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
  const intensity = clamp(topScore / Math.max(total * 0.35, 1), 0.4, 1);
  const speed = clamp(0.6 + stats.punctuationDensity * 1.2, 0.5, 2);
  const palette = topThemeColors(themeScores, 3) as [string, string, string];

  return { seed: hashString(poem), kind, intensity, speed, palette };
}
