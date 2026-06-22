import { useMemo, useState } from "react";
import "./App.css";
import { FlowFieldBackground } from "./components/FlowFieldBackground";
import { OrganicLifeform } from "./components/OrganicLifeform";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
import { getThreadColor } from "./lib/particlePresets";
import { buildLifeformSpec } from "./lib/lifeform";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    const spec = buildLifeformSpec(poem);
    return (
      <>
        <OrganicLifeform spec={spec} />
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
