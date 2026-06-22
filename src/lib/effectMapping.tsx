import { ShaderBackground } from "../components/ShaderBackground";
import { unifiedFragmentShader } from "./shaders/unified";
import { analyzePoem, type Theme } from "./themes";
import { topThemeColors } from "./themeColors";

export type EffectResult = {
  Component: () => React.JSX.Element;
  dominantTheme: Theme;
};

function sumThemes(scores: Record<Theme, number>, themes: Theme[]): number {
  return themes.reduce((sum, theme) => sum + scores[theme], 0);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function resolveEffect(poem: string): EffectResult {
  const analysis = analyzePoem(poem);
  const { themeScores, stats } = analysis;

  // the poem's own thematic make-up becomes a continuous mix of four
  // visual languages, rather than a pick among fixed presets
  const flow = sumThemes(themeScores, ["fire", "motion", "loss"]);
  const cell = sumThemes(themeScores, ["fragmentation", "urban", "nature"]);
  const vein = sumThemes(themeScores, ["earth", "stillness", "dark"]);
  const glow = sumThemes(themeScores, ["water", "light", "love"]);

  const total = flow + cell + vein + glow;
  const weightFlow = total > 0 ? flow / total : 0.25;
  const weightCell = total > 0 ? cell / total : 0.25;
  const weightVein = total > 0 ? vein / total : 0.25;
  const weightGlow = total > 0 ? glow / total : 0.25;

  const [colorA, colorB, colorC] = topThemeColors(themeScores, 3);

  const speed = clamp(0.6 + stats.punctuationDensity * 1.4, 0.5, 2.2);
  const scale = clamp(0.8 + stats.avgWordLength / 10, 0.7, 1.6);
  const turbulence = clamp(0.6 + stats.wordCount / 80, 0.5, 2.0);

  function Component() {
    return (
      <ShaderBackground
        fragmentShader={unifiedFragmentShader}
        colors={{ uColorA: colorA, uColorB: colorB, uColorC: colorC }}
        floats={{
          uWeightFlow: weightFlow,
          uWeightCell: weightCell,
          uWeightVein: weightVein,
          uWeightGlow: weightGlow,
          uSpeed: speed,
          uScale: scale,
          uTurbulence: turbulence,
        }}
      />
    );
  }

  return { Component, dominantTheme: analysis.dominantTheme };
}
