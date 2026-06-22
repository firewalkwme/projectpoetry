import { useMemo, useState } from "react";
import { HangingItem } from "./HangingItem";
import { parseStanzas } from "../lib/poemParser";
import { getThreadColor } from "../lib/particlePresets";
import type { Mood } from "../lib/moods";

type Props = {
  poem: string;
  mood: Mood;
  onEdit: () => void;
};

type Piece =
  | { kind: "stanza"; id: string; lines: string[] }
  | { kind: "line"; id: string; text: string };

export function DeconstructedPoem({ poem, mood, onEdit }: Props) {
  const stanzas = useMemo(() => parseStanzas(poem), [poem]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const threadColor = getThreadColor(mood);

  const pieces: Piece[] = useMemo(() => {
    const result: Piece[] = [];
    for (const stanza of stanzas) {
      if (expanded.has(stanza.id)) {
        stanza.lines.forEach((line, i) =>
          result.push({ kind: "line", id: `${stanza.id}-line-${i}`, text: line })
        );
      } else {
        result.push({
          kind: "stanza",
          id: stanza.id,
          lines: stanza.lines,
        });
      }
    }
    return result;
  }, [stanzas, expanded]);

  const expandStanza = (id: string) => {
    setExpanded((prev) => new Set(prev).add(id));
  };

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
      <div style={{ position: "relative", height: "60vh" }}>
        {pieces.map((piece, i) => {
          const left = `${(100 / (pieces.length + 1)) * (i + 1)}%`;
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
          return (
            <HangingItem
              key={piece.id}
              text={piece.text}
              left={left}
              threadColor={threadColor}
            />
          );
        })}
      </div>
    </div>
  );
}
