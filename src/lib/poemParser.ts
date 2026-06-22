export type Stanza = {
  id: string;
  lines: string[];
};

export function parseStanzas(poem: string): Stanza[] {
  const blocks = poem
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, i) => ({
    id: `stanza-${i}`,
    lines: block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  }));
}
