import { useMemo, useState } from "react";
import { ParticleBackground } from "./components/ParticleBackground";
import { PoemInput } from "./components/PoemInput";
import { detectMood } from "./lib/moods";

function App() {
  const [poem, setPoem] = useState("");
  const mood = useMemo(() => detectMood(poem), [poem]);

  return (
    <>
      <ParticleBackground mood={mood} />
      <PoemInput value={poem} onChange={setPoem} mood={mood} />
    </>
  );
}

export default App;
