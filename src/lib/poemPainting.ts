import { hashString } from "./hash";

export type ClusterPlan = {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  radius: number; // normalized to min(width, height)
  tendrils: number;
  dotPositions: { x: number; y: number; size: number; phase: number }[];
  hasOrb: boolean;
  orbAngle: number;
  seed: number;
  // every content word from this stanza, linking words removed -- "they
  // should all be there", not just the most-repeated ones
  words: string[];
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "so", "yet",
  "with", "of", "to", "in", "on", "at", "for", "by", "from",
  "into", "onto", "over", "under", "through", "as",
  "is", "was", "were", "am", "are", "be", "been", "being",
]);

function contentWords(text: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const clean = raw.replace(/[^a-zA-Z']/g, "");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (STOPWORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    words.push(clean);
  }
  return words;
}

export type PaintingPlan = {
  seed: number;
  lyricism: number; // 0..1, drives both ornamentation and motion fluidity
  sizeScale: number; // poem length -> overall composition footprint
  formDuration: number; // poem length -> seconds to fully assemble
  existential: number; // 0..1, density of mortality/void/time imagery
  clusters: ClusterPlan[];
  filaments: [number, number][]; // indices into clusters, connecting lines
};

// words that signal existential / mortal weight -- their presence pushes
// the fractals deeper and more chaotic, on top of mood negativity
const EXISTENTIAL_WORDS = new Set([
  "death", "die", "dead", "dying", "grave", "tomb", "mortal", "mortality",
  "void", "abyss", "nothing", "nothingness", "empty", "emptiness", "oblivion",
  "time", "eternal", "eternity", "forever", "infinite", "soul", "god",
  "heaven", "hell", "fate", "doom", "decay", "rot", "dust", "ash", "ashes",
  "wound", "blood", "ravening", "ferocious", "knife", "blade", "murderous",
  "meaning", "exist", "existence", "being", "vanish", "fade", "perish",
]);

// small deterministic PRNG so the same poem always builds the same
// painting, while the canvas itself still animates on top of it
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildPaintingPlan(poem: string): PaintingPlan {
  const seed = hashString(poem);
  const rng = mulberry32(seed);

  const stanzas = poem
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lines = poem.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = poem.split(/\s+/).filter(Boolean);
  const punctCount = (poem.match(/[,;:—–-]/g) ?? []).length;
  const avgWordLen = words.reduce((a, w) => a + w.replace(/[^a-zA-Z]/g, "").length, 0) / Math.max(words.length, 1);
  const lyricism = Math.min(1, (punctCount / Math.max(lines.length, 1)) * 0.45 + (avgWordLen / 7) * 0.55);

  // poem length controls three things at once: how far the composition
  // spreads across the canvas, how much detail/density it carries, and
  // how long it takes to fully assemble
  const sizeScale = Math.min(1.6, 0.75 + words.length / 160);
  const formDuration = Math.min(30, Math.max(8, 8 + words.length * 0.18));

  // existential weight: fraction of content that lands on mortality/void
  // imagery, scaled so even a few such words register meaningfully
  const existentialHits = words.filter((w) => EXISTENTIAL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ""))).length;
  const existential = Math.min(1, existentialHits / Math.max(words.length * 0.06, 4));

  const clusterCount = Math.max(1, Math.min(7, stanzas.length || Math.ceil(lines.length / 4) || 1));

  const clusters: ClusterPlan[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2 + rng() * 0.5;
    const distFromCenter = (0.16 + rng() * 0.2) * sizeScale;
    const x = 0.5 + Math.cos(angle) * distFromCenter;
    const y = 0.5 + Math.sin(angle) * distFromCenter * 0.8;

    const stanzaWordCount =
      (stanzas[i] ? stanzas[i].split(/\s+/).filter(Boolean).length : 0) ||
      Math.round(words.length / clusterCount);

    const radius = (0.075 + Math.min(stanzaWordCount / 50, 1) * 0.09) * (0.85 + sizeScale * 0.2);
    const dotCount = Math.round((18 + stanzaWordCount * 1.2) * sizeScale);
    const dotPositions = Array.from({ length: dotCount }, () => {
      const a = rng() * Math.PI * 2;
      // stored as a fraction of the cluster's own radius -- the sketch
      // multiplies by the pixel radius at draw time, so don't pre-scale
      // here or the dot field collapses near the center
      const r = 0.3 + rng() * 1.5;
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        size: 1 + rng() * 2.2,
        phase: rng() * Math.PI * 2,
      };
    });

    clusters.push({
      x,
      y,
      radius,
      tendrils: Math.round(3 + lyricism * 6),
      dotPositions,
      hasOrb: rng() > 0.4,
      orbAngle: rng() * Math.PI * 2,
      seed: Math.floor(rng() * 100000),
      words: contentWords(stanzas[i] ?? ""),
    });
  }

  const filaments: [number, number][] = [];
  for (let i = 0; i < clusters.length; i++) {
    filaments.push([i, (i + 1) % clusters.length]);
    if (clusters.length > 2) {
      filaments.push([i, (i + 2) % clusters.length]);
    }
  }

  return { seed, lyricism, sizeScale, formDuration, existential, clusters, filaments };
}
