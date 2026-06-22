import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { hashString } from "../lib/hash";
import { computeWordOffset } from "../lib/wordMotion";
import type { Mood } from "../lib/moods";

type Props = {
  text: string;
  mood: Mood;
  color: string;
  containerHeight: number;
  baseX: number;
  baseY: number;
};

export function FloatingWord({
  text,
  mood,
  color,
  containerHeight,
  baseX,
  baseY,
}: Props) {
  const hash = hashString(text + mood);
  const speedVar = 0.75 + (hash % 50) / 100;
  const fontScale = 0.9 + (hash % 6) * 0.05;

  const elRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef({ x: baseX, y: baseY });
  const startRef = useRef(performance.now());
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    anchorRef.current = { x: baseX, y: baseY };
  }, [baseX, baseY]);

  useEffect(() => {
    let raf: number;
    function frame(now: number) {
      const el = elRef.current;
      if (el && !dragging) {
        const t = ((now - startRef.current) / 1000) * speedVar;
        const { dx, dy } = computeWordOffset(mood, t, hash, containerHeight);
        el.style.transform = `translate(${anchorRef.current.x + dx}px, ${
          anchorRef.current.y + dy
        }px)`;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mood, dragging, hash, speedVar, containerHeight]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const parentRect = elRef.current?.parentElement?.getBoundingClientRect();
    const x = e.clientX - (parentRect?.left ?? 0) - dragOffset.current.x;
    const y = e.clientY - (parentRect?.top ?? 0) - dragOffset.current.y;
    if (elRef.current) {
      elRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
    anchorRef.current = { x, y };
  };

  const onPointerUp = () => {
    setDragging(false);
    startRef.current = performance.now();
  };

  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `translate(${baseX}px, ${baseY}px)`,
    background: "rgba(255,255,255,0.92)",
    color: "#1a1a1a",
    fontFamily: "Georgia, serif",
    fontSize: `${fontScale}rem`,
    padding: "0.3rem 0.6rem",
    borderRadius: 6,
    borderLeft: `3px solid ${color}`,
    boxShadow: dragging
      ? "0 10px 22px rgba(0,0,0,0.35)"
      : "0 3px 10px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
    userSelect: "none",
    cursor: "grab",
    touchAction: "none",
    zIndex: dragging ? 10 : 1,
  };

  return (
    <div
      ref={elRef}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {text}
    </div>
  );
}
