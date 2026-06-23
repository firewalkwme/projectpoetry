import type { Mood } from "./moods";

export type PoemAudioHandle = {
  start: () => void;
  stop: () => void;
  triggerBloom: () => void;
  isPlaying: () => boolean;
};

// ---- pitch material -------------------------------------------------
// each stanza rotates through a different mode and a different timbre,
// so stanzas read as distinct musical "sections" rather than one
// continuous texture
const STANZA_SCALES: number[][] = [
  [0, 2, 3, 5, 7, 8, 10], // natural minor
  [0, 2, 3, 5, 7, 9, 10], // dorian
  [0, 2, 4, 5, 7, 9, 10], // mixolydian
  [0, 2, 4, 5, 7, 9, 11], // major
];
const STANZA_TIMBRES: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];

const MOOD_ROOT_HZ: Record<Mood, number> = {
  joyful: 261.6,
  melancholic: 174.6,
  angry: 196,
  calm: 220,
  romantic: 207.7,
  fearful: 146.8,
  neutral: 196,
};

function noteFreq(rootHz: number, scale: number[], degreeIndex: number): number {
  const len = scale.length;
  const degree = scale[((degreeIndex % len) + len) % len];
  const octave = Math.floor(degreeIndex / len);
  return rootHz * Math.pow(2, (degree + octave * 12) / 12);
}

function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function rhymeKey(line: string): string {
  const words = line.trim().split(/\s+/);
  const last = (words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return last.slice(-2) || last;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

// ---- environmental sound rules ---------------------------------------
// "both": mood sets a quiet base ambient bed, and specific keyword
// mentions in the poem layer in additional, louder environmental sounds
// on top of it
type EnvLayerName = "water" | "wind" | "fire" | "drone";
type SfxName = "bells" | "footsteps" | "animals";

const ENV_KEYWORDS: Record<EnvLayerName, string[]> = {
  water: ["ocean", "sea", "wave", "waves", "rain", "water", "river", "flood", "tide", "drip", "drown"],
  wind: ["wind", "breeze", "air", "storm", "gale", "gust"],
  fire: ["fire", "flame", "flames", "burn", "burning", "ember", "embers", "ash", "spark", "saffron"],
  drone: ["grave", "dark", "death", "shadow", "dread", "blade", "knife", "wound", "blood", "murderous", "ferocious"],
};

const SFX_KEYWORDS: Record<SfxName, string[]> = {
  bells: ["bell", "bells", "chime", "song", "music"],
  footsteps: ["walk", "walked", "step", "steps", "foot", "feet", "march", "path", "ground", "land", "shoved", "threw", "pushed"],
  animals: ["bird", "birds", "wing", "wings", "owl", "crow", "animal", "creature"],
};

const MOOD_BASE_LAYER: Record<Mood, EnvLayerName> = {
  joyful: "wind",
  melancholic: "wind",
  angry: "fire",
  calm: "water",
  romantic: "water",
  fearful: "drone",
  neutral: "wind",
};

type ContinuousLayer = {
  gain: GainNode;
  stopAll: () => void;
};

function createNoiseBuffer(ctx: AudioContext, color: "white" | "pink"): AudioBuffer {
  const size = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < size; i++) {
    const white = Math.random() * 2 - 1;
    if (color === "pink") {
      b0 = 0.99 * b0 + white * 0.1;
      b1 = 0.97 * b1 + white * 0.05;
      data[i] = b0 + b1 + white * 0.05;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

function createEnvLayer(ctx: AudioContext, name: EnvLayerName, master: GainNode): ContinuousLayer {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  const stops: (() => void)[] = [];

  if (name === "water") {
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, "pink");
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    const swell = ctx.createGain();
    swell.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain).connect(swell.gain);
    noise.connect(filter).connect(swell).connect(gain);
    noise.start();
    lfo.start();
    stops.push(() => { noise.stop(); lfo.stop(); });
  } else if (name === "wind") {
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, "white");
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 500;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain).connect(filter.frequency);
    noise.connect(filter).connect(gain);
    noise.start();
    lfo.start();
    stops.push(() => { noise.stop(); lfo.stop(); });
  } else if (name === "fire") {
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, "white");
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2200;
    const crackle = ctx.createGain();
    crackle.gain.value = 0.5;
    const lfo1 = ctx.createOscillator();
    lfo1.type = "square";
    lfo1.frequency.value = 7;
    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine";
    lfo2.frequency.value = 11.3;
    const lfoSum = ctx.createGain();
    lfoSum.gain.value = 0.35;
    lfo1.connect(lfoSum);
    lfo2.connect(lfoSum);
    lfoSum.connect(crackle.gain);
    noise.connect(filter).connect(crackle).connect(gain);
    noise.start();
    lfo1.start();
    lfo2.start();
    stops.push(() => { noise.stop(); lfo1.stop(); lfo2.stop(); });
  } else {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 58;
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = 29;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 0.18;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 1.5;
    vibrato.connect(vibratoGain).connect(osc.frequency);
    osc.connect(gain);
    sub.connect(gain);
    osc.start();
    sub.start();
    vibrato.start();
    stops.push(() => { osc.stop(); sub.stop(); vibrato.stop(); });
  }

  return { gain, stopAll: () => stops.forEach((s) => s()) };
}

function playBell(ctx: AudioContext, master: GainNode, time: number, freq: number) {
  for (const mult of [1, 2.4, 3.8]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.06 / mult, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + 1.7);
  }
}

function playFootstep(ctx: AudioContext, master: GainNode, time: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, "pink");
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.18, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
  noise.connect(filter).connect(g).connect(master);
  noise.start(time);
  noise.stop(time + 0.3);
}

function playAnimal(ctx: AudioContext, master: GainNode, time: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const up = Math.random() > 0.5;
  osc.frequency.setValueAtTime(up ? 1400 : 2200, time);
  osc.frequency.exponentialRampToValueAtTime(up ? 2200 : 1200, time + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.05, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  osc.connect(g).connect(master);
  osc.start(time);
  osc.stop(time + 0.2);
}

// chorused note/chord: each pitch gets two slightly detuned oscillators
// of the stanza's timbre, summed under one envelope -- richer than a
// single bare oscillator, but still soft/ambient rather than plucky
function playChord(ctx: AudioContext, master: GainNode, time: number, freqs: number[], duration: number, timbre: OscillatorType, peak: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  g.connect(master);
  for (const freq of freqs) {
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = timbre;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(g);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    }
  }
}

export function createPoemAudio(poem: string, mood: Mood): PoemAudioHandle {
  const stanzas = poem
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const allLines = stanzas.flat();
  const lowerPoem = poem.toLowerCase();

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let playing = false;
  let timers: number[] = [];
  const envLayers = new Map<EnvLayerName, ContinuousLayer>();

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  function keywordHits(words: string[]): number {
    return words.filter((w) => lowerPoem.includes(w)).length;
  }

  function setupEnvironment() {
    if (!ctx || !master) return;
    const baseLayer = MOOD_BASE_LAYER[mood];

    (Object.keys(ENV_KEYWORDS) as EnvLayerName[]).forEach((name) => {
      const layer = createEnvLayer(ctx!, name, master!);
      envLayers.set(name, layer);
      const hits = keywordHits(ENV_KEYWORDS[name]);
      const isBase = name === baseLayer;
      // only the mood's base layer plays without any keyword support, and
      // even then at a low level -- nothing plays at full, constant volume
      // just by being the default
      const target = isBase ? 0.05 : 0;
      const boosted = Math.min(0.16, target + hits * 0.045);
      if (boosted > 0) {
        layer.gain.gain.linearRampToValueAtTime(boosted, ctx!.currentTime + 3);
      }
    });
  }

  // schedules one full pass through the poem. pitch comes from three
  // combined signals: line length sets the base scale degree, a word
  // that has appeared before always recurs on the same pitch (repetition
  // becomes a melodic motif), and rhyming line-endings replay the full
  // chord built for the first line that introduced that rhyme. rhythm
  // comes from splitting each line into one note per word, with note
  // duration driven by that word's estimated syllable count. each stanza
  // rotates to a different mode + oscillator timbre.
  function scheduleLoop() {
    if (!ctx || !master || !playing) return;
    let time = ctx.currentTime + 0.3;
    const rhymeChordMemory = new Map<string, number[]>();
    const wordPitchMemory = new Map<string, number>();

    stanzas.forEach((lines, stanzaIdx) => {
      const scale = STANZA_SCALES[stanzaIdx % STANZA_SCALES.length];
      const timbre = STANZA_TIMBRES[stanzaIdx % STANZA_TIMBRES.length];
      const rootHz = MOOD_ROOT_HZ[mood] * Math.pow(2, (stanzaIdx % 2) * 0.5 - 0.25);
      const isMajor = scale.includes(4);
      const third = isMajor ? 4 : 3;

      lines.forEach((line) => {
        const words = line.split(/\s+/).filter(Boolean);
        const baseDegree = words.length % scale.length;

        const sfxFired = new Set<SfxName>();
        words.forEach((rawWord, wordIdx) => {
          const word = normalizeWord(rawWord);
          let degree = baseDegree + (wordIdx % 3) - 1;
          if (word.length > 2 && wordPitchMemory.has(word)) {
            degree = wordPitchMemory.get(word)!;
          } else if (word.length > 2) {
            wordPitchMemory.set(word, degree);
          }

          const syllables = estimateSyllables(rawWord);
          const duration = 0.22 + syllables * 0.16;
          const freq = noteFreq(rootHz, scale, degree);
          playChord(ctx!, master!, time, [freq], duration, timbre, 0.045);

          (Object.keys(SFX_KEYWORDS) as SfxName[]).forEach((sfx) => {
            if (sfxFired.has(sfx)) return;
            if (SFX_KEYWORDS[sfx].some((kw) => word === kw)) {
              sfxFired.add(sfx);
              if (sfx === "bells") playBell(ctx!, master!, time, freq * 2);
              else if (sfx === "footsteps") playFootstep(ctx!, master!, time);
              else playAnimal(ctx!, master!, time);
            }
          });

          time += duration * 0.7 + 0.05;
        });

        const key = rhymeKey(line);
        const lastDegree = baseDegree + ((words.length - 1) % 3) - 1;
        if (rhymeChordMemory.has(key)) {
          const chordFreqs = rhymeChordMemory.get(key)!.map((d) => noteFreq(rootHz, scale, d));
          playChord(ctx!, master!, time, chordFreqs, 1.1, timbre, 0.05);
        } else {
          const chordDegrees = [lastDegree, lastDegree + third, lastDegree + 7];
          rhymeChordMemory.set(key, chordDegrees);
          playChord(ctx!, master!, time, chordDegrees.map((d) => noteFreq(rootHz, scale, d)), 1.1, timbre, 0.045);
        }
        time += 0.5;
      });

      if (stanzaIdx < stanzas.length - 1) time += 1.1; // stanza break = rest
    });

    const totalMs = Math.max((time - ctx.currentTime) * 1000, 1000);
    timers.push(window.setTimeout(scheduleLoop, totalMs));
  }

  return {
    start() {
      if (playing) return;
      if (allLines.length === 0) return;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      playing = true;
      setupEnvironment();
      scheduleLoop();
    },
    stop() {
      playing = false;
      clearTimers();
      envLayers.forEach((layer) => layer.stopAll());
      envLayers.clear();
      ctx?.close();
      ctx = null;
      master = null;
    },
    triggerBloom() {
      if (!ctx) return;
      const now = ctx.currentTime;
      const layers = Array.from(envLayers.values());
      let loudest: ContinuousLayer | undefined;
      for (const layer of layers) {
        if (!loudest || layer.gain.gain.value > loudest.gain.gain.value) loudest = layer;
      }
      if (loudest) {
        const g = loudest.gain.gain;
        const current = g.value;
        g.cancelScheduledValues(now);
        g.setValueAtTime(current, now);
        g.linearRampToValueAtTime(Math.min(current + 0.12, 0.3), now + 0.3);
        g.linearRampToValueAtTime(current, now + 4);
      }
    },
    isPlaying() {
      return playing;
    },
  };
}
