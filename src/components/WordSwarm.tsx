import { useEffect, useLayoutEffect, useRef } from "react";
import { hashString } from "../lib/hash";
import { getMoodPhysics } from "../lib/wordMotion";
import type { Mood } from "../lib/moods";

export type SwarmWord = {
  text: string;
  fontScale: number;
};

type Props = {
  words: SwarmWord[];
  mood: Mood;
  color: string;
  containerWidth: number;
  containerHeight: number;
};

const DRAG_THRESHOLD = 4;
const FLEE_DURATION = 0.6;
const FLEE_BURST = 320;
const FLEE_ACCEL = 900;
const REPEL_STRENGTH = 1400;
const REPEL_PADDING = 6;

type WordState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  halfW: number;
  halfH: number;
  paused: boolean;
  dragging: boolean;
  flee: { active: boolean; dirX: number; dirY: number; timeLeft: number };
};

export function WordSwarm({ words, mood, color, containerWidth, containerHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<WordState[]>([]);
  const dragIndex = useRef<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const lastTime = useRef<number | null>(null);

  // (re)initialize physics state whenever the word list or container changes
  useEffect(() => {
    const w = Math.max(containerWidth, 40);
    const h = Math.max(containerHeight, 40);
    const physics = getMoodPhysics(mood);

    stateRef.current = words.map((word) => {
      const hash = hashString(word.text + mood);
      const spreadOffset =
        (((hash % 1000) / 1000) - 0.5) * physics.initialAngleSpread;
      const angle = physics.initialAngleCenter + spreadOffset;
      return {
        x: 20 + (hash % Math.max(w - 40, 1)),
        y: 20 + ((hash >> 5) % Math.max(h - 40, 1)),
        vx: Math.cos(angle) * physics.speed,
        vy: Math.sin(angle) * physics.speed,
        halfW: 40,
        halfH: 14,
        paused: false,
        dragging: false,
        flee: { active: false, dirX: 0, dirY: 0, timeLeft: 0 },
      };
    });
  }, [words, mood, containerWidth, containerHeight]);

  // measure actual rendered size of each word once mounted, so collision
  // boxes match real text width instead of a guessed constant
  useLayoutEffect(() => {
    elRefs.current.forEach((el, i) => {
      const state = stateRef.current[i];
      if (!el || !state) return;
      const rect = el.getBoundingClientRect();
      state.halfW = rect.width / 2 + REPEL_PADDING;
      state.halfH = rect.height / 2 + REPEL_PADDING;
    });
  }, [words]);

  useEffect(() => {
    let raf: number;
    const physics = getMoodPhysics(mood);
    const w = Math.max(containerWidth, 40);
    const h = Math.max(containerHeight, 40);

    function frame(now: number) {
      const last = lastTime.current ?? now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastTime.current = now;

      const states = stateRef.current;

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (s.dragging) continue;

        if (s.flee.active) {
          s.vx += s.flee.dirX * FLEE_ACCEL * dt;
          s.vy += s.flee.dirY * FLEE_ACCEL * dt;
          s.flee.timeLeft -= dt;
          if (s.flee.timeLeft <= 0) s.flee.active = false;
        } else if (!s.paused) {
          const turbAngle = (Math.random() - 0.5) * physics.turbulence * dt;
          const cos = Math.cos(turbAngle);
          const sin = Math.sin(turbAngle);
          const nvx = s.vx * cos - s.vy * sin;
          const nvy = s.vx * sin + s.vy * cos;
          s.vx = nvx;
          s.vy = nvy + physics.biasY * dt;

          if (Math.random() < physics.dartChance) {
            const dartAngle = Math.random() * Math.PI * 2;
            s.vx += Math.cos(dartAngle) * physics.dartStrength * dt;
            s.vy += Math.sin(dartAngle) * physics.dartStrength * dt;
          }
        }

        const speed = Math.hypot(s.vx, s.vy);
        const maxSpeed = physics.speed * (s.flee.active ? 5 : 2.2);
        if (speed > maxSpeed) {
          s.vx = (s.vx / speed) * maxSpeed;
          s.vy = (s.vy / speed) * maxSpeed;
        }
      }

      // pairwise box-overlap repulsion so words never sit on top of each
      // other; soft acceleration push rather than a rigid position snap,
      // so it still reads as organic motion rather than a rules engine
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const a = states[i];
          const b = states[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const overlapX = a.halfW + b.halfW - Math.abs(dx);
          const overlapY = a.halfH + b.halfH - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            const pushX = (overlapX / (a.halfW + b.halfW)) * Math.sign(dx || Math.random() - 0.5);
            const pushY = (overlapY / (a.halfH + b.halfH)) * Math.sign(dy || Math.random() - 0.5);
            const fx = pushX * REPEL_STRENGTH * dt;
            const fy = pushY * REPEL_STRENGTH * dt;
            if (!a.dragging) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (!b.dragging) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }
      }

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (s.dragging) continue;

        let nx = s.x + s.vx * dt;
        let ny = s.y + s.vy * dt;

        if (physics.edgeMode === "bounce" || s.flee.active) {
          if (nx < 0) {
            nx = 0;
            s.vx = Math.abs(s.vx);
          } else if (nx > w) {
            nx = w;
            s.vx = -Math.abs(s.vx);
          }
          if (ny < 0) {
            ny = 0;
            s.vy = Math.abs(s.vy);
          } else if (ny > h) {
            ny = h;
            s.vy = -Math.abs(s.vy);
          }
        } else {
          if (nx < 0) nx = w;
          else if (nx > w) nx = 0;
          if (ny < -20) ny = h + 20;
          else if (ny > h + 20) ny = -20;
        }

        s.x = nx;
        s.y = ny;

        const el = elRefs.current[i];
        if (el) el.style.transform = `translate(${nx}px, ${ny}px)`;
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mood, containerWidth, containerHeight, words]);

  function handlePointerDown(i: number, e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStart.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    dragIndex.current = i;
  }

  function handlePointerMove(i: number, e: React.PointerEvent<HTMLDivElement>) {
    if (dragIndex.current !== i) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
      stateRef.current[i].dragging = true;
    }
    if (!movedRef.current) return;

    const parentRect = containerRef.current?.getBoundingClientRect();
    const x = e.clientX - (parentRect?.left ?? 0) - dragOffset.current.x;
    const y = e.clientY - (parentRect?.top ?? 0) - dragOffset.current.y;
    const s = stateRef.current[i];
    s.x = x;
    s.y = y;
    const el = elRefs.current[i];
    if (el) el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function handlePointerUp(i: number, e: React.PointerEvent<HTMLDivElement>) {
    const s = stateRef.current[i];
    if (!s) return;

    if (!movedRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = centerX - e.clientX;
      let dy = centerY - e.clientY;
      const len = Math.hypot(dx, dy);
      if (len < 0.01) {
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        dx /= len;
        dy /= len;
      }
      s.flee = { active: true, dirX: dx, dirY: dy, timeLeft: FLEE_DURATION };
      s.vx += dx * FLEE_BURST;
      s.vy += dy * FLEE_BURST;
    }

    s.dragging = false;
    dragIndex.current = null;
    lastTime.current = null;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {words.map((word, i) => (
        <div
          key={`${i}-${word.text}`}
          ref={(el) => {
            elRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            color,
            fontFamily: "Georgia, serif",
            fontSize: `${word.fontScale}rem`,
            textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            userSelect: "none",
            cursor: "grab",
            touchAction: "none",
          }}
          onPointerDown={(e) => handlePointerDown(i, e)}
          onPointerMove={(e) => handlePointerMove(i, e)}
          onPointerUp={(e) => handlePointerUp(i, e)}
          onMouseEnter={() => {
            stateRef.current[i].paused = true;
          }}
          onMouseLeave={() => {
            stateRef.current[i].paused = false;
          }}
        >
          {word.text}
        </div>
      ))}
    </div>
  );
}
