import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingWord } from "./FloatingWord";
import { getThreadColor } from "../lib/particlePresets";
import { hashString } from "../lib/hash";
import { isThemeWord, type Theme } from "../lib/themes";
import type { Mood } from "../lib/moods";

type Props = {
  poem: string;
  mood: Mood;
  dominantTheme: Theme;
  onEdit: () => void;
};

export function DeconstructedPoem({ poem, mood, dominantTheme, onEdit }: Props) {
  const words = useMemo(
    () => poem.split(/\s+/).map((w) => w.trim()).filter(Boolean),
    [poem]
  );
  const threadColor = getThreadColor(mood);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        padding: "2rem 1rem 4rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
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
      <div
        ref={containerRef}
        style={{ position: "relative", height: "80vh", overflow: "hidden" }}
      >
        {words.map((word, i) => {
          const id = `word-${i}-${word}`;
          const hash = hashString(id);
          const baseX = (hash % Math.max(size.width - 80, 1)) + 20;
          const baseY = ((hash >> 5) % Math.max(size.height - 60, 1)) + 20;
          const emphasized = isThemeWord(word, dominantTheme);
          return (
            <FloatingWord
              key={id}
              text={word}
              mood={mood}
              color={threadColor}
              containerWidth={size.width}
              containerHeight={size.height}
              baseX={baseX}
              baseY={baseY}
              emphasized={emphasized}
            />
          );
        })}
      </div>
    </div>
  );
}
