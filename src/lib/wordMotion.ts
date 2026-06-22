import type { Mood } from "./moods";

type Offset = { dx: number; dy: number };

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function computeWordOffset(
  mood: Mood,
  t: number,
  hash: number,
  containerHeight: number
): Offset {
  const phase = ((hash % 1000) / 1000) * Math.PI * 2;
  const phase2 = (((hash >> 4) % 1000) / 1000) * Math.PI * 2;
  const phase3 = (((hash >> 8) % 1000) / 1000) * Math.PI * 2;
  const safeHeight = Math.max(containerHeight, 100);

  switch (mood) {
    case "joyful": {
      // bouncy: arcing bounce plus a fast jittery shake
      const dy = -Math.abs(Math.sin(t * 2.2 + phase)) * 22;
      const dx =
        Math.sin(t * 0.8 + phase2) * 14 + Math.sin(t * 9 + phase3) * 4;
      return { dx, dy };
    }
    case "angry": {
      // fast, erratic, overlapping frequencies — restless shake
      const dx =
        Math.sin(t * 11 + phase) * 10 +
        Math.sin(t * 23 + phase2) * 6 +
        Math.sin(t * 5 + phase3) * 4;
      const dy =
        Math.sin(t * 13 + phase2) * 10 + Math.sin(t * 27 + phase3) * 5;
      return { dx, dy };
    }
    case "melancholic": {
      // slow downward spiral, like sinking/drowning in still water
      const sinkSpeed = 14;
      const dy = (t * sinkSpeed) % safeHeight;
      const radius = 16 + (hash % 12);
      const dx = Math.cos(t * 0.9 + phase) * radius;
      return { dx, dy };
    }
    case "fearful": {
      // nervous jitter with sudden darts, plus a slow smoke-like creep downward
      const dartInterval = 1.4;
      const dartIndex = Math.floor(t / dartInterval);
      const dartX = (pseudoRandom(hash + dartIndex) - 0.5) * 36;
      const dartY = (pseudoRandom(hash + dartIndex + 99) - 0.5) * 24;
      const jitterX = Math.sin(t * 26 + phase) * 3;
      const jitterY = Math.sin(t * 31 + phase2) * 3;
      const creep = (t * 6) % safeHeight;
      return { dx: dartX + jitterX, dy: dartY + jitterY + creep };
    }
    case "calm": {
      // slow, gentle circular drift
      const radius = 12;
      const dx = Math.cos(t * 0.5 + phase) * radius;
      const dy = Math.sin(t * 0.5 + phase) * radius;
      return { dx, dy };
    }
    case "romantic": {
      // soft upward float with a gentle sway, looping like a balloon
      const riseSpeed = 10;
      const dy = -((t * riseSpeed) % safeHeight);
      const dx = Math.sin(t * 0.9 + phase) * 14;
      return { dx, dy };
    }
    default: {
      // neutral: gentle bob
      const dx = Math.sin(t * 0.3 + phase) * 8;
      const dy = Math.sin(t * 0.45 + phase2) * 8;
      return { dx, dy };
    }
  }
}
