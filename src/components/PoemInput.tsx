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
    onChange(draft);
    onSubmit();
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontFamily: "Georgia, serif" }}>Write here</h1>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type or paste a poem..."
        rows={10}
        style={{
          width: "100%",
          fontSize: "1.1rem",
          fontFamily: "Georgia, serif",
          padding: "1rem",
          borderRadius: 8,
          border: "1px solid #ccc",
          resize: "vertical",
        }}
      />
      <button
        onClick={handleSubmit}
        style={{
          marginTop: "1rem",
          fontSize: "1rem",
          fontFamily: "Georgia, serif",
          padding: "0.6rem 1.5rem",
          borderRadius: 8,
          border: "1px solid #888",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Submit
      </button>
      <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
        Detected mood: <strong>{mood}</strong>
      </p>
    </div>
  );
}
