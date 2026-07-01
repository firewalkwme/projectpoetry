export type Mood =
  | "joyful"
  | "melancholic"
  | "angry"
  | "calm"
  | "romantic"
  | "fearful"
  | "neutral";

const LEXICON: Record<Exclude<Mood, "neutral">, string[]> = {
  joyful: [
    "joy", "joyful", "happy", "happiness", "laugh", "laughter", "smile",
    "delight", "bright", "sunshine", "cheer", "cheerful", "bliss", "glee",
    "celebrate", "dance", "sparkle", "radiant", "glow", "wonderful",
  ],
  melancholic: [
    "sad", "sadness", "sorrow", "tears", "cry", "crying", "grief", "weep",
    "lonely", "loneliness", "lost", "fading", "gray", "grey", "ache",
    "longing", "empty", "emptiness", "hollow", "mourn", "wither", "fade",
    "gloom", "abyss", "subtle", "years", "far", "remember", "absence",
    "gone", "distance", "ending", "passed", "little", "maybe",
  ],
  angry: [
    "anger", "angry", "rage", "fury", "furious", "hate", "hatred", "wrath",
    "scream", "burn", "burning", "fire", "fierce", "fight", "rage", "bitter",
    "storm", "thunder", "violent", "scorn",
  ],
  calm: [
    "calm", "peace", "peaceful", "quiet", "still", "stillness", "gentle",
    "serene", "tranquil", "soft", "breeze", "rest", "soothe", "drift",
    "float", "hush", "silence", "soft", "ease",
  ],
  romantic: [
    "love", "lover", "kiss", "heart", "darling", "beloved", "embrace",
    "romance", "passion", "desire", "tender", "sweetheart", "longing",
    "whisper", "caress", "forever", "soulmate", "devotion",
  ],
  fearful: [
    "fear", "afraid", "terror", "dread", "scared", "shiver", "dark",
    "darkness", "nightmare", "haunt", "haunted", "panic", "horror",
    "shadow", "tremble", "anxious", "dread", "creeping", "ghost",
  ],
};

const WORD_RE = /[a-z']+/g;

export function detectMood(text: string): Mood {
  const words = text.toLowerCase().match(WORD_RE) ?? [];
  if (words.length === 0) return "neutral";

  const scores: Record<Exclude<Mood, "neutral">, number> = {
    joyful: 0,
    melancholic: 0,
    angry: 0,
    calm: 0,
    romantic: 0,
    fearful: 0,
  };

  for (const word of words) {
    for (const mood of Object.keys(LEXICON) as Array<
      Exclude<Mood, "neutral">
    >) {
      if (LEXICON[mood].includes(word)) {
        scores[mood] += 1;
      }
    }
  }

  let topMood: Mood = "neutral";
  let topScore = 0;
  for (const mood of Object.keys(scores) as Array<Exclude<Mood, "neutral">>) {
    if (scores[mood] > topScore) {
      topScore = scores[mood];
      topMood = mood;
    }
  }

  return topMood;
}
