export type Theme =
  | "water"
  | "fire"
  | "earth"
  | "fragmentation"
  | "light"
  | "dark"
  | "urban"
  | "nature"
  | "motion"
  | "stillness"
  | "love"
  | "loss";

export const THEME_LEXICON: Record<Theme, string[]> = {
  water: [
    "water", "rain", "river", "ocean", "sea", "wave", "waves", "tide",
    "flood", "drown", "drowning", "stream", "lake", "drop", "drip", "wet",
    "tears", "flow", "flowing", "rippling", "ripple", "mist", "fog",
  ],
  fire: [
    "fire", "flame", "burn", "burning", "ash", "ember", "blaze", "spark",
    "heat", "smoke", "scorch", "ignite", "molten", "inferno", "glow",
  ],
  earth: [
    "earth", "stone", "rock", "soil", "dust", "clay", "mountain", "ground",
    "root", "roots", "bone", "bones", "ancient", "old", "rust", "decay",
    "fossil", "weathered", "crumbling", "erode", "eroded", "time", "age",
  ],
  fragmentation: [
    "broken", "break", "shatter", "shattered", "fragment", "fragments",
    "crack", "cracked", "split", "scatter", "scattered", "torn", "tear",
    "piece", "pieces", "fracture", "fractured", "splinter", "unravel",
  ],
  light: [
    "light", "sun", "sunlight", "bright", "shine", "shining", "glow",
    "glowing", "radiant", "gleam", "gold", "golden", "dawn", "morning",
    "star", "stars", "luminous",
  ],
  dark: [
    "dark", "darkness", "night", "shadow", "shadows", "black", "void",
    "dim", "gloom", "midnight", "abyss", "obscure", "hollow",
  ],
  urban: [
    "city", "street", "streets", "building", "buildings", "concrete",
    "traffic", "subway", "neon", "pavement", "skyline", "alley", "window",
    "windows", "apartment", "car", "cars",
  ],
  nature: [
    "tree", "trees", "forest", "leaf", "leaves", "flower", "flowers",
    "grass", "wind", "bird", "birds", "sky", "field", "garden", "branch",
    "branches", "seed", "bloom", "blossom",
  ],
  motion: [
    "run", "running", "fall", "falling", "fly", "flying", "dance",
    "dancing", "spin", "spinning", "rush", "drift", "drifting", "chase",
    "leap", "race", "swirl", "swirling", "wander", "wandering",
  ],
  stillness: [
    "still", "stillness", "quiet", "silence", "silent", "calm", "rest",
    "sleep", "sleeping", "frozen", "pause", "motionless", "stayed", "wait",
    "waiting", "stay",
  ],
  love: [
    "love", "lover", "heart", "kiss", "embrace", "darling", "beloved",
    "tender", "desire", "longing", "sweetheart", "devotion", "romance",
  ],
  loss: [
    "loss", "lost", "gone", "grief", "mourn", "mourning", "goodbye",
    "absence", "empty", "emptiness", "forget", "forgotten", "leave",
    "left", "alone", "loneliness", "lonely",
  ],
};

export type PoemStats = {
  wordCount: number;
  avgWordLength: number;
  punctuationDensity: number;
  lineCount: number;
};

export type PoemAnalysis = {
  themeScores: Record<Theme, number>;
  stats: PoemStats;
};

const WORD_RE = /[a-z']+/g;

export function analyzePoem(poem: string): PoemAnalysis {
  const words = poem.toLowerCase().match(WORD_RE) ?? [];
  const lines = poem.split("\n").filter((l) => l.trim().length > 0);
  const punctuationMatches = poem.match(/[.,;:!?—-]/g) ?? [];

  const themeScores = Object.keys(THEME_LEXICON).reduce((acc, theme) => {
    acc[theme as Theme] = 0;
    return acc;
  }, {} as Record<Theme, number>);

  for (const word of words) {
    for (const theme of Object.keys(THEME_LEXICON) as Theme[]) {
      if (THEME_LEXICON[theme].includes(word)) {
        themeScores[theme] += 1;
      }
    }
  }

  const totalLength = words.reduce((sum, w) => sum + w.length, 0);

  return {
    themeScores,
    stats: {
      wordCount: words.length,
      avgWordLength: words.length > 0 ? totalLength / words.length : 0,
      punctuationDensity:
        words.length > 0 ? punctuationMatches.length / words.length : 0,
      lineCount: Math.max(lines.length, 1),
    },
  };
}
