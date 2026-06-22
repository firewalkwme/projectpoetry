import { useMemo, useState } from "react";
import "./App.css";
import { FlowFieldBackground } from "./components/FlowFieldBackground";
import { NatureBackground } from "./components/NatureBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
import { getThreadColor } from "./lib/particlePresets";
import { resolveElemental } from "./lib/elemental";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    const spec = resolveElemental(poem);
    return (
      <>
        <NatureBackground spec={spec} />
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
