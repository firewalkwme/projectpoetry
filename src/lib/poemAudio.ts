export type PoemAudioHandle = {
  start: () => void;
  stop: () => void;
  triggerRainBurst: () => void;
  isPlaying: () => boolean;
};

// a small minor/pentatonic-ish scale (semitones from root) -- kept
// deliberately narrow so generated lines always sound consonant with
// each other regardless of which degree a line lands on
const SCALE = [0, 3, 5, 7, 10, 12, 15];
const ROOT_HZ = 196; // G3

function noteFreq(semitoneIndex: number): number {
  const degree = SCALE[((semitoneIndex % SCALE.length) + SCALE.length) % SCALE.length];
  const octave = Math.floor(semitoneIndex / SCALE.length);
  return ROOT_HZ * Math.pow(2, (degree + octave * 12) / 12);
}

function rhymeKey(line: string): string {
  const words = line.trim().split(/\s+/);
  const last = (words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return last.slice(-2) || last;
}

export function createPoemAudio(poem: string): PoemAudioHandle {
  const stanzas = poem
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const allLines = stanzas.flat();

  let ctx: AudioContext | null = null;
  let playing = false;
  let timers: number[] = [];
  let rainGain: GainNode | null = null;
  let rainSource: AudioBufferSourceNode | null = null;

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  function playNote(time: number, freq: number, duration: number, peak: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  function setupRain() {
    if (!ctx) return;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1400;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.015;
    noise.connect(filter).connect(rainGain).connect(ctx.destination);
    noise.start();
    rainSource = noise;
  }

  // schedules one full pass through the poem: pitch per line comes from
  // that line's length (rhythm/texture), note duration scales with line
  // length too, stanza breaks become longer rests, and lines that rhyme
  // (matching word endings) replay the same pitch -- an audible rhyme
  function scheduleLoop() {
    if (!ctx || !playing) return;
    let time = ctx.currentTime + 0.3;
    const rhymeMemory = new Map<string, number>();
    let semitoneCursor = 0;

    stanzas.forEach((lines, stanzaIdx) => {
      lines.forEach((line) => {
        const key = rhymeKey(line);
        let semitone: number;
        if (rhymeMemory.has(key)) {
          semitone = rhymeMemory.get(key)!;
        } else {
          semitone = semitoneCursor;
          semitoneCursor += (line.replace(/[^a-zA-Z]/g, "").length % 4) - 1;
          rhymeMemory.set(key, semitone);
        }
        const freq = noteFreq(semitone);
        const duration = 0.35 + Math.min(line.length / 60, 1.1);
        playNote(time, freq, duration, 0.05);
        time += duration * 0.75 + 0.1;
      });
      if (stanzaIdx < stanzas.length - 1) time += 0.9; // stanza break = rest
    });

    const totalMs = Math.max((time - ctx.currentTime) * 1000, 1000);
    timers.push(window.setTimeout(scheduleLoop, totalMs));
  }

  return {
    start() {
      if (playing) return;
      if (allLines.length === 0) return;
      ctx = new AudioContext();
      playing = true;
      setupRain();
      scheduleLoop();
    },
    stop() {
      playing = false;
      clearTimers();
      rainSource?.stop();
      rainSource = null;
      ctx?.close();
      ctx = null;
    },
    triggerRainBurst() {
      if (!ctx || !rainGain) return;
      const now = ctx.currentTime;
      rainGain.gain.cancelScheduledValues(now);
      rainGain.gain.setValueAtTime(rainGain.gain.value, now);
      rainGain.gain.linearRampToValueAtTime(0.1, now + 0.4);
      rainGain.gain.linearRampToValueAtTime(0.015, now + 5);
    },
    isPlaying() {
      return playing;
    },
  };
}
