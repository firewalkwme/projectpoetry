import { useMemo, useState } from "react";
import "./App.css";
import { ParticleBackground } from "./components/ParticleBackground";
import { FlowFieldBackground } from "./components/FlowFieldBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
import { getThreadColor } from "./lib/particlePresets";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    return (
      <>
        <ParticleBackground mood={mood} />
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
