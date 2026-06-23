import { useEffect, useMemo, useRef, useState } from "react";
import { PoemCanvas } from "./PoemCanvas";
import { MOOD_PALETTE } from "../lib/particlePresets";
import { buildPaintingPlan } from "../lib/poemPainting";
import { createPoemAudio } from "../lib/poemAudio";
import type { Mood } from "../lib/moods";

type Props = {
  poem: string;
  mood: Mood;
  onEdit: () => void;
};

export function DeconstructedPoem({ poem, mood, onEdit }: Props) {
  const palette = MOOD_PALETTE[mood];
  const plan = useMemo(() => buildPaintingPlan(poem), [poem]);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(createPoemAudio(poem, mood));

  useEffect(() => {
    audioRef.current = createPoemAudio(poem, mood);
    return () => audioRef.current.stop();
  }, [poem, mood]);

  const toggleSound = () => {
    if (soundOn) {
      audioRef.current.stop();
      setSoundOn(false);
    } else {
      audioRef.current.start();
      setSoundOn(true);
    }
  };

  return (
    <>
      <PoemCanvas plan={plan} palette={palette} onBloom={() => audioRef.current.triggerBloom()} />
      <div style={{ position: "relative", textAlign: "center", padding: "2rem 1rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
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
        <button
          onClick={toggleSound}
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.9rem",
            padding: "0.4rem 1rem",
            borderRadius: 8,
            border: "1px solid #888",
            background: soundOn ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
            cursor: "pointer",
          }}
        >
          {soundOn ? "🔊 sound on" : "🔈 sound off"}
        </button>
      </div>
    </>
  );
}
