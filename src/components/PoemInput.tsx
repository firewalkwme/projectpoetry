import type { Mood } from "../lib/moods";

type Props = {
  value: string;
  onChange: (value: string) => void;
  mood: Mood;
};

export function PoemInput({ value, onChange, mood }: Props) {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontFamily: "Georgia, serif" }}>Mood Poem</h1>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
        Detected mood: <strong>{mood}</strong>
      </p>
    </div>
  );
}
