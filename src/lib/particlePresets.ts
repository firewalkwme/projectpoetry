import type { ISourceOptions } from "@tsparticles/engine";
import type { Mood } from "./moods";

type Preset = {
  background: string;
  options: ISourceOptions;
};

const PRESETS: Record<Mood, Preset> = {
  joyful: {
    background: "#fff7e6",
    options: {
      particles: {
        number: { value: 80 },
        color: { value: ["#ffb703", "#fb8500", "#ffd166", "#ff006e"] },
        shape: { type: "circle" },
        opacity: { value: 0.8 },
        size: { value: { min: 2, max: 6 } },
        move: { enable: true, speed: 2, direction: "top", outModes: { default: "out" } },
      },
    },
  },
  melancholic: {
    background: "#1d2433",
    options: {
      particles: {
        number: { value: 60 },
        color: { value: ["#8d99ae", "#5c6b8a", "#3a4a6b"] },
        shape: { type: "circle" },
        opacity: { value: 0.4 },
        size: { value: { min: 1, max: 4 } },
        move: { enable: true, speed: 0.6, direction: "bottom", outModes: { default: "out" } },
      },
    },
  },
  angry: {
    background: "#1a0b0b",
    options: {
      particles: {
        number: { value: 100 },
        color: { value: ["#d00000", "#dc2f02", "#e85d04", "#9d0208"] },
        shape: { type: "triangle" },
        opacity: { value: 0.7 },
        size: { value: { min: 2, max: 7 } },
        move: { enable: true, speed: 4, direction: "none", outModes: { default: "bounce" } },
      },
    },
  },
  calm: {
    background: "#e8f6f3",
    options: {
      particles: {
        number: { value: 50 },
        color: { value: ["#a8dadc", "#90e0ef", "#caf0f8"] },
        shape: { type: "circle" },
        opacity: { value: 0.5 },
        size: { value: { min: 2, max: 5 } },
        move: { enable: true, speed: 0.4, direction: "none", outModes: { default: "out" } },
      },
    },
  },
  romantic: {
    background: "#2b1320",
    options: {
      particles: {
        number: { value: 70 },
        color: { value: ["#ff4d6d", "#ff8fa3", "#c9184a", "#ffccd5"] },
        shape: { type: "heart" },
        opacity: { value: 0.7 },
        size: { value: { min: 2, max: 6 } },
        move: { enable: true, speed: 1, direction: "top", outModes: { default: "out" } },
      },
    },
  },
  fearful: {
    background: "#0a0a0a",
    options: {
      particles: {
        number: { value: 90 },
        color: { value: ["#3a0ca3", "#240046", "#10002b", "#5a189a"] },
        shape: { type: "circle" },
        opacity: { value: 0.6 },
        size: { value: { min: 1, max: 5 } },
        move: { enable: true, speed: 1.5, direction: "none", random: true, outModes: { default: "out" } },
      },
    },
  },
  neutral: {
    background: "#f5f5f5",
    options: {
      particles: {
        number: { value: 40 },
        color: { value: ["#adb5bd", "#ced4da", "#dee2e6"] },
        shape: { type: "circle" },
        opacity: { value: 0.5 },
        size: { value: { min: 1, max: 4 } },
        move: { enable: true, speed: 0.8, direction: "none", outModes: { default: "out" } },
      },
    },
  },
};

export function getPreset(mood: Mood): Preset {
  return PRESETS[mood];
}
