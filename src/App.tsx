import { useMemo, useState } from "react";
import "./App.css";
import { FlowFieldBackground } from "./components/FlowFieldBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
import { getThreadColor } from "./lib/particlePresets";
import { resolveEffect } from "./lib/effectMapping";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    const { Component: Background, dominantTheme } = resolveEffect(poem);
    return (
      <>
        <Background />
        <FlowFieldBackground tint={getThreadColor(mood)} cornersOnly />
        <DeconstructedPoem
          poem={poem}
          mood={mood}
          dominantTheme={dominantTheme}
          onEdit={() => setSubmitted(false)}
        />
      </>
    );
  }

  return (
    <>
      <FlowFieldBackground tint={getThreadColor(mood)} />
      <PoemInput
        value={poem}
        onChange={setPoem}
        onSubmit={() => setSubmitted(true)}
      />
    </>
  );
}

export default App;
