export function countWordFrequencies(poem: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = poem.toLowerCase().match(/[a-z']+/g) ?? [];
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}
