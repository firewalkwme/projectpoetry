import { useMemo, useState } from "react";
import "./App.css";
import { ParticleBackground } from "./components/ParticleBackground";
import { PoemInput } from "./components/PoemInput";
import { DeconstructedPoem } from "./components/DeconstructedPoem";
import { detectMood } from "./lib/moods";

function App() {
  const [poem, setPoem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mood = useMemo(() => detectMood(poem), [poem]);

  return (
    <>
      <ParticleBackground mood={mood} />
      {submitted && poem.trim() ? (
        <DeconstructedPoem
          poem={poem}
          mood={mood}
          onEdit={() => setSubmitted(false)}
        />
      ) : (
        <PoemInput
          value={poem}
          onChange={setPoem}
          mood={mood}
          onSubmit={() => setSubmitted(true)}
        />
      )}
    </>
  );
}

export default App;
