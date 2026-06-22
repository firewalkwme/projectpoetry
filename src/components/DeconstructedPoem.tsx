import { useEffect, useMemo, useRef, useState } from "react";
import { HangingItem } from "./HangingItem";
import { FloatingWord } from "./FloatingWord";
import { parseStanzas } from "../lib/poemParser";
import { getThreadColor } from "../lib/particlePresets";
import { hashString } from "../lib/hash";
import type { Mood } from "../lib/moods";

type Props = {
  poem: string;
  mood: Mood;
  onEdit: () => void;
};

type Piece =
  | { kind: "stanza"; id: string; lines: string[] }
  | { kind: "line"; id: string; text: string }
  | { kind: "word"; id: string; text: string };

export function DeconstructedPoem({ poem, mood, onEdit }: Props) {
  const stanzas = useMemo(() => parseStanzas(poem), [poem]);
  const [expandedStanzas, setExpandedStanzas] = useState<Set<string>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
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

  const pieces: Piece[] = useMemo(() => {
    const result: Piece[] = [];
    for (const stanza of stanzas) {
      if (!expandedStanzas.has(stanza.id)) {
        result.push({ kind: "stanza", id: stanza.id, lines: stanza.lines });
        continue;
      }
      stanza.lines.forEach((line, li) => {
        const lineId = `${stanza.id}-line-${li}`;
        if (!expandedLines.has(lineId)) {
          result.push({ kind: "line", id: lineId, text: line });
          return;
        }
        line
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word, wi) => {
            result.push({ kind: "word", id: `${lineId}-word-${wi}`, text: word });
          });
      });
    }
    return result;
  }, [stanzas, expandedStanzas, expandedLines]);

  const expandStanza = (id: string) =>
    setExpandedStanzas((prev) => new Set(prev).add(id));
  const expandLine = (id: string) =>
    setExpandedLines((prev) => new Set(prev).add(id));

  return (
    <div
      style={{
        position: "relative",
        minHeight: "70vh",
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
        style={{ position: "relative", height: "60vh", overflow: "hidden" }}
      >
        {pieces.map((piece, i) => {
          const leftPct = (100 / (pieces.length + 1)) * (i + 1);
          const left = `${leftPct}%`;

          if (piece.kind === "stanza") {
            return (
              <HangingItem
                key={piece.id}
                text={piece.lines.join(" / ")}
                left={left}
                threadColor={threadColor}
                onActivate={() => expandStanza(piece.id)}
                hint="click to unravel"
              />
            );
          }

          if (piece.kind === "line") {
            return (
              <HangingItem
                key={piece.id}
                text={piece.text}
                left={left}
                threadColor={threadColor}
                onActivate={() => expandLine(piece.id)}
                hint="click to scatter"
              />
            );
          }

          const baseX = (leftPct / 100) * size.width;
          const baseY =
            60 + (hashString(piece.id) % Math.max(size.height - 120, 1));
          return (
            <FloatingWord
              key={piece.id}
              text={piece.text}
              mood={mood}
              color={threadColor}
              containerHeight={size.height}
              baseX={baseX}
              baseY={baseY}
            />
          );
        })}
      </div>
    </div>
  );
}
