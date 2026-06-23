import { hashString } from "./hash";
import { countWordFrequencies } from "./wordFrequency";

export type ClusterPlan = {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  radius: number; // normalized to min(width, height)
  tendrils: number;
  dotPositions: { x: number; y: number; size: number; phase: number }[];
  hasOrb: boolean;
  orbAngle: number;
  seed: number;
  word?: string;
};

export type PaintingPlan = {
  seed: number;
  lyricism: number; // 0..1, drives how curling/ornate the piece reads
  clusters: ClusterPlan[];
  filaments: [number, number][]; // indices into clusters, connecting lines
};

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

function topWords(poem: string, count: number): string[] {
  const frequencies = countWordFrequencies(poem);
  const seen = new Set<string>();
  const ranked = Array.from(frequencies.entries())
    .filter(([w]) => w.length > 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => {
      if (seen.has(w)) return false;
      seen.add(w);
      return true;
    });
  return ranked.slice(0, count);
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

  const clusterCount = Math.max(1, Math.min(7, stanzas.length || Math.ceil(lines.length / 4) || 1));
  const labels = topWords(poem, clusterCount);

  const clusters: ClusterPlan[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2 + rng() * 0.5;
    const distFromCenter = 0.16 + rng() * 0.2;
    const x = 0.5 + Math.cos(angle) * distFromCenter;
    const y = 0.5 + Math.sin(angle) * distFromCenter * 0.8;

    const stanzaWordCount =
      (stanzas[i] ? stanzas[i].split(/\s+/).filter(Boolean).length : 0) ||
      Math.round(words.length / clusterCount);

    const radius = 0.075 + Math.min(stanzaWordCount / 50, 1) * 0.09;
    const dotCount = Math.round(18 + stanzaWordCount * 1.2);
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
      word: labels[i],
    });
  }

  const filaments: [number, number][] = [];
  for (let i = 0; i < clusters.length; i++) {
    filaments.push([i, (i + 1) % clusters.length]);
  }

  return { seed, lyricism, clusters, filaments };
}
