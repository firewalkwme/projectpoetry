import type { ComponentType } from "react";
import { ShaderBackground } from "../components/ShaderBackground";
import { plasmaFragmentShader } from "./shaders/plasma";
import { voronoiFragmentShader } from "./shaders/voronoi";
import { causticsFragmentShader } from "./shaders/caustics";
import { marbleFragmentShader } from "./shaders/marble";
import { analyzePoem, type Theme } from "./themes";

export type EffectKey = "caustics" | "plasma" | "marble" | "voronoi";

const EFFECT_SHADERS: Record<EffectKey, string> = {
  caustics: causticsFragmentShader,
  plasma: plasmaFragmentShader,
  marble: marbleFragmentShader,
  voronoi: voronoiFragmentShader,
};

// each effect's "home" themes — the poem's strongest theme among these
// decides which effect gets born from it
const EFFECT_THEMES: Record<EffectKey, Theme[]> = {
  caustics: ["water", "light", "love"],
  plasma: ["fire", "motion", "loss"],
  marble: ["earth", "stillness", "dark"],
  voronoi: ["fragmentation", "urban", "nature"],
};

export type EffectParams = {
  speed: number;
  scale: number;
  turbulence: number;
};

export type EffectResult = {
  key: EffectKey;
  Component: ComponentType<{ tint?: string }>;
  params: EffectParams;
  dominantTheme: Theme;
};

function scoreEffect(themeScores: Record<Theme, number>, effect: EffectKey): number {
  return EFFECT_THEMES[effect].reduce((sum, theme) => sum + themeScores[theme], 0);
}

export function resolveEffect(poem: string): EffectResult {
  const analysis = analyzePoem(poem);
  const effectOrder: EffectKey[] = ["caustics", "plasma", "marble", "voronoi"];

  let chosen: EffectKey = "marble";
  let topScore = -1;
  for (const effect of effectOrder) {
    const score = scoreEffect(analysis.themeScores, effect);
    // ties broken by fixed order above, so the result is fully
    // deterministic for a given poem rather than randomly resolved
    if (score > topScore) {
      topScore = score;
      chosen = effect;
    }
  }

  const { stats } = analysis;

  // structure of the poem itself tunes how the chosen effect behaves,
  // so two poems landing on the same effect still look distinct
  const speed = clamp(0.6 + stats.punctuationDensity * 1.4, 0.5, 2.2);
  const scale = clamp(0.8 + stats.avgWordLength / 10, 0.7, 1.6);
  const turbulence = clamp(0.6 + stats.wordCount / 80, 0.5, 2.0);

  return {
    key: chosen,
    Component: ({ tint }) => (
      <ShaderBackground
        fragmentShader={EFFECT_SHADERS[chosen]}
        tint={tint}
        speed={speed}
        scale={scale}
        turbulence={turbulence}
      />
    ),
    params: { speed, scale, turbulence },
    dominantTheme: analysis.dominantTheme,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
