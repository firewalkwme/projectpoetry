import { useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Mood } from "../lib/moods";
import { getPreset } from "../lib/particlePresets";

type Props = {
  mood: Mood;
};

export function ParticleBackground({ mood }: Props) {
  const preset = useMemo(() => getPreset(mood), [mood]);

  return (
    <ParticlesProvider init={loadSlim}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: preset.background,
          transition: "background 1s ease",
        }}
      >
        <Particles id={`particles-${mood}`} options={preset.options} />
      </div>
    </ParticlesProvider>
  );
}
