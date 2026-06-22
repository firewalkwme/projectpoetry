import { useMemo, useState } from "react";
import "./App.css";
import { FlowFieldBackground } from "./components/FlowFieldBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
import { getThreadColor } from "./lib/particlePresets";
import { pickBackgroundEffect } from "./lib/backgroundEffects";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    const Background = pickBackgroundEffect(poem);
    return (
      <>
        <Background tint={getThreadColor(mood)} />
        <FlowFieldBackground tint={getThreadColor(mood)} cornersOnly />
        <DeconstructedPoem
          poem={poem}
          mood={mood}
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
