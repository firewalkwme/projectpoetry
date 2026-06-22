import { useMemo, useState } from "react";
import "./App.css";
import { MoonPhase } from "./components/MoonPhase";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  if (submitted && poem.trim()) {
    return (
      <DeconstructedPoem poem={poem} mood={mood} onEdit={() => setSubmitted(false)} />
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
