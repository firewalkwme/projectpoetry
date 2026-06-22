import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { hashString } from "../lib/hash";
import { getMoodPhysics } from "../lib/wordMotion";
import type { Mood } from "../lib/moods";

type Props = {
  text: string;
  mood: Mood;
  color: string;
  containerWidth: number;
  containerHeight: number;
  baseX: number;
  baseY: number;
  emphasized?: boolean;
};

const DRAG_THRESHOLD = 4;
const FLEE_DURATION = 0.6;
const FLEE_BURST = 320;
const FLEE_ACCEL = 900;

export function FloatingWord({
  text,
  mood,
  color,
  containerWidth,
  containerHeight,
  baseX,
  baseY,
  emphasized = false,
}: Props) {
  const hash = hashString(text + mood);
  const fontScale = (0.95 + (hash % 6) * 0.06) * (emphasized ? 1.5 : 1);

  const elRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: baseX, y: baseY });
  const vel = useRef<{ x: number; y: number } | null>(null);
  const lastTime = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const fleeing = useRef({ active: false, dirX: 0, dirY: 0, timeLeft: 0 });

  useEffect(() => {
    let raf: number;
    const physics = getMoodPhysics(mood);

    if (!vel.current) {
      const spreadOffset =
        (((hash % 1000) / 1000) - 0.5) * physics.initialAngleSpread;
      const angle = physics.initialAngleCenter + spreadOffset;
      vel.current = {
        x: Math.cos(angle) * physics.speed,
        y: Math.sin(angle) * physics.speed,
      };
    }

    function frame(now: number) {
      const last = lastTime.current ?? now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastTime.current = now;

      const el = elRef.current;
      const v = vel.current!;

      const flee = fleeing.current;
      if (el && !dragging && (!paused || flee.active)) {

        if (flee.active) {
          v.x += flee.dirX * FLEE_ACCEL * dt;
          v.y += flee.dirY * FLEE_ACCEL * dt;
          flee.timeLeft -= dt;
          if (flee.timeLeft <= 0) flee.active = false;
        } else {
          const turbAngle = (Math.random() - 0.5) * physics.turbulence * dt;
          const cos = Math.cos(turbAngle);
          const sin = Math.sin(turbAngle);
          const nvx = v.x * cos - v.y * sin;
          const nvy = v.x * sin + v.y * cos;
          v.x = nvx;
          v.y = nvy + physics.biasY * dt;

          if (Math.random() < physics.dartChance) {
            const dartAngle = Math.random() * Math.PI * 2;
            v.x += Math.cos(dartAngle) * physics.dartStrength * dt;
            v.y += Math.sin(dartAngle) * physics.dartStrength * dt;
          }
        }

        const speed = Math.hypot(v.x, v.y);
        const maxSpeed = physics.speed * (flee.active ? 5 : 2.2);
        if (speed > maxSpeed) {
          v.x = (v.x / speed) * maxSpeed;
          v.y = (v.y / speed) * maxSpeed;
        }

        let nx = pos.current.x + v.x * dt;
        let ny = pos.current.y + v.y * dt;

        const w = Math.max(containerWidth, 40);
        const h = Math.max(containerHeight, 40);

        if (physics.edgeMode === "bounce" || flee.active) {
          if (nx < 0) {
            nx = 0;
            v.x = Math.abs(v.x);
          } else if (nx > w) {
            nx = w;
            v.x = -Math.abs(v.x);
          }
          if (ny < 0) {
            ny = 0;
            v.y = Math.abs(v.y);
          } else if (ny > h) {
            ny = h;
            v.y = -Math.abs(v.y);
          }
        } else {
          if (nx < 0) nx = w;
          else if (nx > w) nx = 0;
          if (ny < -20) ny = h + 20;
          else if (ny > h + 20) ny = -20;
        }

        pos.current = { x: nx, y: ny };
        el.style.transform = `translate(${nx}px, ${ny}px)`;
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mood, paused, dragging, containerWidth, containerHeight, hash]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStart.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      moved.current = true;
      setDragging(true);
    }
    if (!moved.current) return;

    const parentRect = elRef.current?.parentElement?.getBoundingClientRect();
    const x = e.clientX - (parentRect?.left ?? 0) - dragOffset.current.x;
    const y = e.clientY - (parentRect?.top ?? 0) - dragOffset.current.y;
    if (elRef.current) {
      elRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
    pos.current = { x, y };
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!moved.current) {
      // click, not a drag: send the word fleeing away from the click point
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

      fleeing.current = { active: true, dirX: dx, dirY: dy, timeLeft: FLEE_DURATION };
      if (vel.current) {
        vel.current.x += dx * FLEE_BURST;
        vel.current.y += dy * FLEE_BURST;
      }
    }
    setDragging(false);
    lastTime.current = null;
  };

  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `translate(${baseX}px, ${baseY}px)`,
    color,
    fontFamily: "Georgia, serif",
    fontSize: `${fontScale}rem`,
    fontWeight: emphasized ? 700 : 400,
    textShadow: emphasized
      ? `0 0 16px ${color}, 0 1px 6px rgba(0,0,0,0.5)`
      : "0 1px 6px rgba(0,0,0,0.5)",
    whiteSpace: "nowrap",
    userSelect: "none",
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={elRef}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {text}
    </div>
  );
}
