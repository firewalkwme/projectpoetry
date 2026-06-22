import { useMemo } from "react";
import { PoemCanvas } from "./PoemCanvas";
import { getThreadColor } from "../lib/particlePresets";
import { countWordFrequencies, normalizeWord } from "../lib/wordFrequency";
import { resolveElemental } from "../lib/elemental";
import type { SceneWord } from "../lib/poemSketch";
import type { Mood } from "../lib/moods";

type Props = {
  poem: string;
  mood: Mood;
  onEdit: () => void;
};

export function DeconstructedPoem({ poem, mood, onEdit }: Props) {
  const threadColor = getThreadColor(mood);
  const elemental = useMemo(() => resolveElemental(poem), [poem]);

  const sceneWords: SceneWord[] = useMemo(() => {
    const rawWords = poem.split(/\s+/).map((w) => w.trim()).filter(Boolean);
    const frequencies = countWordFrequencies(poem);
    const maxCount = Math.max(...Array.from(frequencies.values()), 1);

    return rawWords.map((text) => {
      const count = frequencies.get(normalizeWord(text)) ?? 1;
      // repetition is this poem's own emphasis signal: a word repeated
      // many times renders larger, scaling with how dominant it is
      // relative to the most-repeated word in this specific poem
      const repetitionBoost = 1 + (Math.log2(count) / Math.log2(maxCount + 1)) * 0.9;
      const hash = text.length + text.charCodeAt(0);
      const jitter = 0.95 + (hash % 6) * 0.05;
      return { text, fontScale: jitter * repetitionBoost };
    });
  }, [poem]);

  return (
    <>
      <PoemCanvas words={sceneWords} mood={mood} color={threadColor} elemental={elemental} />
      <div style={{ position: "relative", textAlign: "center", padding: "2rem 1rem" }}>
        <button
          onClick={onEdit}
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.9rem",
            padding: "0.4rem 1rem",
            borderRadius: 8,
            border: "1px solid #888",
            background: "rgba(255,255,255,0.85)",
            cursor: "pointer",
          }}
        >
          ← edit poem
        </button>
      </div>
    </>
  );
}
