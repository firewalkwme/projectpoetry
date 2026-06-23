import type { Mood } from "./moods";

// surreal, earthy/jewel-toned palettes per mood -- deliberately muted and
// painterly rather than neon, to match the reference paintings (Redon/Ernst
// style botanical-cosmic dreamscapes) rather than the glowing-orb look
export const MOOD_PALETTE: Record<Mood, string[]> = {
  joyful: ["#caa24a", "#e2c275", "#8c4a3a", "#3c5b4e", "#f1e2b0"],
  melancholic: ["#3a4a5e", "#6b7c93", "#232838", "#8d99ae", "#171c28"],
  angry: ["#7a1f2b", "#b3432f", "#2b1014", "#d97a3f", "#4a1118"],
  calm: ["#7fa9a0", "#cfd9c7", "#3f5e5a", "#e8e0c9", "#4f6f72"],
  romantic: ["#b0566f", "#e3a9b0", "#5c2a3a", "#d8a0a8", "#7a3a4a"],
  fearful: ["#1c1f33", "#3b2f4a", "#0d0c14", "#54466b", "#241f33"],
  neutral: ["#6e6457", "#a89f8a", "#3d3830", "#c9bfa5", "#534b3f"],
};
