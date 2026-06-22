import type { Theme } from "./themes";

export const THEME_COLORS: Record<Theme, string> = {
  water: "#1d4ed8",
  fire: "#ea580c",
  earth: "#92400e",
  fragmentation: "#6b7280",
  light: "#f59e0b",
  dark: "#4c1d95",
  urban: "#475569",
  nature: "#16a34a",
  motion: "#db2777",
  stillness: "#0e7490",
  love: "#ec4899",
  loss: "#334155",
};

const FALLBACK_PALETTE = ["#334155", "#1d4ed8", "#6b7280"];

export function topThemeColors(
  themeScores: Record<Theme, number>,
  count = 3
): string[] {
  const ranked = (Object.keys(themeScores) as Theme[])
    .filter((theme) => themeScores[theme] > 0)
    .sort((a, b) => themeScores[b] - themeScores[a]);

  if (ranked.length === 0) return FALLBACK_PALETTE.slice(0, count);

  const colors = ranked.slice(0, count).map((theme) => THEME_COLORS[theme]);
  while (colors.length < count) {
    colors.push(colors[colors.length - 1] ?? FALLBACK_PALETTE[0]);
  }
  return colors;
}
