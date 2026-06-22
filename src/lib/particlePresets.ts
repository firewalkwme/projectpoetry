import type { Mood } from "./moods";

const THREAD_COLORS: Record<Mood, string> = {
  joyful: "#ffb703",
  melancholic: "#8d99ae",
  angry: "#d00000",
  calm: "#a8dadc",
  romantic: "#ff4d6d",
  fearful: "#3a0ca3",
  neutral: "#adb5bd",
};

export function getThreadColor(mood: Mood): string {
  return THREAD_COLORS[mood];
}
