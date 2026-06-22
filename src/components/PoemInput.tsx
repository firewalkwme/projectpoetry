import { useState } from "react";
import type { Mood } from "../lib/moods";

type Props = {
  value: string;
  onChange: (value: string) => void;
  mood: Mood;
  onSubmit: () => void;
};

export function PoemInput({ value, onChange, mood, onSubmit }: Props) {
  const [draft, setDraft] = useState(value);

  const handleSubmit = () => {
    if (!draft.trim()) return;
    onChange(draft);
    onSubmit();
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2.5rem",
        padding: "2rem",
        color: "#f4f4f4",
      }}
    >
      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 400,
          fontSize: "2.4rem",
          letterSpacing: "0.04em",
          margin: 0,
          opacity: 0.92,
        }}
      >
        Write here
      </h1>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type or paste a poem..."
        rows={10}
        style={{
          width: "min(620px, 90vw)",
          fontSize: "1.15rem",
          lineHeight: 1.6,
          fontFamily: "Georgia, serif",
          color: "#f4f4f4",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid rgba(244,244,244,0.35)",
          outline: "none",
          resize: "none",
          textAlign: "center",
          padding: "0.5rem 0",
        }}
      />

      <button
        onClick={handleSubmit}
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "0.95rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "0.6rem 2rem",
          borderRadius: 999,
          border: "1px solid rgba(244,244,244,0.5)",
          background: "transparent",
          color: "#f4f4f4",
          cursor: "pointer",
          transition: "background 0.2s ease, color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(244,244,244,0.9)";
          e.currentTarget.style.color = "#0a0a0a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#f4f4f4";
        }}
      >
        Submit
      </button>

      <p style={{ opacity: 0.45, fontSize: "0.85rem", letterSpacing: "0.05em" }}>
        mood: {mood}
      </p>
    </div>
  );
}
