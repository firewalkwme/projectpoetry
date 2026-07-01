import type { Mood } from "./moods";

// ---- public interface ------------------------------------------------
export type EnvShot =
  | "water" | "wind" | "fire" | "thunder"
  | "birds" | "heartbeat" | "bells" | "drone";

export type PoemAudioHandle = {
  start: () => void;
  stop: () => void;
  triggerEnv: (kind: EnvShot) => void;
  isPlaying: () => boolean;
};

// ---- pitch material --------------------------------------------------
// each stanza rotates through a different mode and a different timbre,
// so stanzas read as distinct musical "sections"
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

// ---- environmental sound routing -------------------------------------
// which keywords map a clicked cluster to which environmental one-shot;
// if a cluster has no matching words, the mood's default is used instead
const ENV_KEYWORDS: Record<EnvShot, string[]> = {
  water: ["ocean", "sea", "wave", "waves", "rain", "water", "river", "flood", "tide", "drip", "drown", "milk", "juice"],
  wind: ["wind", "breeze", "air", "gale", "gust", "sky", "cloud", "breath"],
  fire: ["fire", "flame", "flames", "burn", "burning", "ember", "embers", "spark", "saffron", "sun", "fired"],
  thunder: ["thunder", "lightning", "rage", "fury", "wrath", "roar", "crack", "enraged", "ferocious", "storm"],
  birds: ["bird", "birds", "wing", "wings", "owl", "crow", "sparrow", "sing", "song", "fly", "dawn", "feather"],
  heartbeat: ["heart", "blood", "bloodstained", "chest", "pulse", "wound", "wounded", "body", "vein"],
  bells: ["bell", "bells", "chime", "toll", "church", "sacred", "prayer", "holy", "pray"],
  drone: ["grave", "death", "dead", "void", "dark", "darkness", "shadow", "dread", "nothing", "time", "eternal", "abyss", "deep", "mad", "thirst", "ravening", "mother", "blade", "knife", "murderous"],
};

// tie-break priority: louder/heavier sounds win when a cluster mentions
// several themes at once
const ENV_PRIORITY: EnvShot[] = ["thunder", "fire", "water", "drone", "heartbeat", "birds", "bells", "wind"];

const MOOD_DEFAULT_SHOT: Record<Mood, EnvShot> = {
  joyful: "birds",
  melancholic: "water",
  angry: "thunder",
  calm: "water",
  romantic: "bells",
  fearful: "drone",
  neutral: "wind",
};

export function resolveClusterSound(words: string[], mood: Mood): EnvShot {
  const norm = words.map(normalizeWord);
  let best: EnvShot | null = null;
  let bestHits = 0;
  for (const kind of ENV_PRIORITY) {
    const hits = norm.filter((w) => ENV_KEYWORDS[kind].includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = kind;
    }
  }
  return best ?? MOOD_DEFAULT_SHOT[mood];
}

// ---- synthesis helpers -----------------------------------------------
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

// chorused note/chord: each pitch gets two slightly detuned oscillators
// of the stanza's timbre, summed under one soft envelope
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

// ---- environmental one-shots (fired only on user interaction) --------
function noiseShot(ctx: AudioContext, master: GainNode, color: "white" | "pink", filter: BiquadFilterType, freq: number, q: number, peak: number, attack: number, dur: number) {
  const t = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, color);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noise.connect(f).connect(g).connect(master);
  noise.start(t);
  noise.stop(t + dur + 0.05);
  return { f, g, t };
}

function shotWater(ctx: AudioContext, master: GainNode) {
  const { f, t } = noiseShot(ctx, master, "pink", "lowpass", 500, 0.5, 0.22, 0.25, 1.4);
  f.frequency.setValueAtTime(350, t);
  f.frequency.linearRampToValueAtTime(900, t + 0.6);
  f.frequency.linearRampToValueAtTime(400, t + 1.4);
}

function shotWind(ctx: AudioContext, master: GainNode) {
  const { f, t } = noiseShot(ctx, master, "white", "bandpass", 500, 0.8, 0.16, 0.4, 2);
  f.frequency.setValueAtTime(300, t);
  f.frequency.linearRampToValueAtTime(850, t + 1);
  f.frequency.linearRampToValueAtTime(320, t + 2);
}

function shotFire(ctx: AudioContext, master: GainNode) {
  // a scatter of tiny highpass crackle pops over ~1s
  for (let i = 0; i < 14; i++) {
    const t = ctx.currentTime + Math.random() * 1;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, "white");
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2500 + Math.random() * 2500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.07, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05);
    noise.connect(f).connect(g).connect(master);
    noise.start(t);
    noise.stop(t + 0.12);
  }
}

function shotThunder(ctx: AudioContext, master: GainNode) {
  const t = ctx.currentTime;
  // initial crack
  const crack = ctx.createBufferSource();
  crack.buffer = createNoiseBuffer(ctx, "white");
  const cf = ctx.createBiquadFilter();
  cf.type = "lowpass";
  cf.frequency.value = 1800;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  crack.connect(cf).connect(cg).connect(master);
  crack.start(t);
  crack.stop(t + 0.5);
  // long low rumble
  const { f } = noiseShot(ctx, master, "pink", "lowpass", 160, 0.7, 0.26, 0.12, 2.6);
  f.frequency.linearRampToValueAtTime(70, ctx.currentTime + 2.6);
}

function shotBirds(ctx: AudioContext, master: GainNode) {
  const n = 2 + Math.floor(Math.random() * 3);
  let t = ctx.currentTime;
  for (let i = 0; i < n; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const base = 1600 + Math.random() * 1400;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(base, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
    t += 0.1 + Math.random() * 0.18;
  }
}

function shotHeartbeat(ctx: AudioContext, master: GainNode) {
  // lub-dub: two low thumps
  for (const [offset, peak] of [[0, 0.32], [0.28, 0.22]] as [number, number][]) {
    const t = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

function shotBells(ctx: AudioContext, master: GainNode) {
  const t = ctx.currentTime;
  const base = 320 + Math.random() * 120;
  for (const mult of [1, 2.4, 3.8, 5.2]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = base * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 / mult, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 2.5);
  }
}

function shotDrone(ctx: AudioContext, master: GainNode) {
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  g.connect(master);
  for (const [type, freq] of [["sine", 48], ["triangle", 24], ["sine", 72]] as [OscillatorType, number][]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 3.7);
  }
}

const SHOTS: Record<EnvShot, (ctx: AudioContext, master: GainNode) => void> = {
  water: shotWater,
  wind: shotWind,
  fire: shotFire,
  thunder: shotThunder,
  birds: shotBirds,
  heartbeat: shotHeartbeat,
  bells: shotBells,
  drone: shotDrone,
};

export function createPoemAudio(poem: string, mood: Mood): PoemAudioHandle {
  const stanzas = poem
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const allLines = stanzas.flat();

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let playing = false;
  let timers: number[] = [];

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  // the always-on ambient composition. pitch combines three signals:
  // line length sets the base scale degree, a repeated word always recurs
  // on the same pitch (repetition -> melodic motif), and rhyming line
  // endings replay the full chord built for the first line of that rhyme.
  // rhythm comes from one note per word, duration from syllable count.
  // each stanza rotates to a different mode + timbre.
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
      scheduleLoop();
    },
    stop() {
      playing = false;
      clearTimers();
      ctx?.close();
      ctx = null;
      master = null;
    },
    triggerEnv(kind: EnvShot) {
      if (!ctx || !master || !playing) return;
      SHOTS[kind](ctx, master);
    },
    isPlaying() {
      return playing;
    },
  };
}
