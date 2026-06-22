import type { ComponentType } from "react";
import { ShaderBackground } from "../components/ShaderBackground";
import { plasmaFragmentShader } from "./shaders/plasma";
import { voronoiFragmentShader } from "./shaders/voronoi";
import { causticsFragmentShader } from "./shaders/caustics";
import { marbleFragmentShader } from "./shaders/marble";
import { hashString } from "./hash";

type BackgroundProps = { tint?: string };

function withShader(fragmentShader: string): ComponentType<BackgroundProps> {
  return ({ tint }) => (
    <ShaderBackground fragmentShader={fragmentShader} tint={tint} />
  );
}

export const BACKGROUND_EFFECTS: ComponentType<BackgroundProps>[] = [
  withShader(plasmaFragmentShader),
  withShader(voronoiFragmentShader),
  withShader(causticsFragmentShader),
  withShader(marbleFragmentShader),
];

export function pickBackgroundEffect(seed: string) {
  const index = hashString(seed) % BACKGROUND_EFFECTS.length;
  return BACKGROUND_EFFECTS[index];
}
