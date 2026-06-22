import { useMemo, useState } from "react";
import "./App.css";
import { MoonPhase } from "./components/MoonPhase";
import { NatureBackground } from "./components/NatureBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";
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
      <MoonPhase />
      <PoemInput
        value={poem}
        onChange={setPoem}
        onSubmit={() => setSubmitted(true)}
      />
    </>
  );
}

export default App;
