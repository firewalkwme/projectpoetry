import { FlowFieldBackground } from "../components/FlowFieldBackground";
import { FilmGrainFlicker } from "../components/backgrounds/FilmGrainFlicker";
import { WaveLines } from "../components/backgrounds/WaveLines";
import { VectorStreamlines } from "../components/backgrounds/VectorStreamlines";
import { SketchScribble } from "../components/backgrounds/SketchScribble";
import { hashString } from "./hash";

export const BACKGROUND_EFFECTS = [
  FlowFieldBackground,
  FilmGrainFlicker,
  WaveLines,
  VectorStreamlines,
  SketchScribble,
];

export function pickBackgroundEffect(seed: string) {
  const index = hashString(seed) % BACKGROUND_EFFECTS.length;
  return BACKGROUND_EFFECTS[index];
}
