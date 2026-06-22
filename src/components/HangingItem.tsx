import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { hashString } from "../lib/hash";

type Props = {
  text: string;
  left: string;
  threadColor: string;
  onActivate?: () => void;
  hint?: string;
};

export function HangingItem({ text, left, threadColor, onActivate, hint }: Props) {
  const hash = hashString(text);
  const swayDuration = 3 + (hash % 25) / 10;
  const swayDelay = -((hash % 30) / 10);
  const tilt = (hash % 7) - 3;
  const threadLength = 50 + (hash % 70);
  const fontScale = 0.95 + (hash % 5) * 0.06;

  const [pos, setPos] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const moved = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, dx: pos.dx, dy: pos.dy };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const moveX = e.clientX - dragStart.current.x;
    const moveY = e.clientY - dragStart.current.y;
    if (Math.abs(moveX) > 3 || Math.abs(moveY) > 3) moved.current = true;
    setPos({ dx: dragStart.current.dx + moveX, dy: dragStart.current.dy + moveY });
  };

  const onPointerUp = () => setDragging(false);

  const handleClick = () => {
    if (!moved.current) onActivate?.();
  };

  const cardStyle: CSSProperties = {
    "--base-tilt": `${tilt}deg`,
    transformOrigin: "top center",
    animationDuration: `${swayDuration}s`,
    animationDelay: `${swayDelay}s`,
    animationPlayState: dragging ? "paused" : "running",
    background: "rgba(255,255,255,0.94)",
    color: "#1a1a1a",
    fontFamily: "Georgia, serif",
    fontSize: `${fontScale}rem`,
    padding: "0.5rem 0.9rem",
    borderRadius: 6,
    boxShadow: dragging
      ? "0 10px 24px rgba(0,0,0,0.35)"
      : "0 4px 14px rgba(0,0,0,0.25)",
    whiteSpace: "nowrap",
    userSelect: "none",
  } as CSSProperties;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translate(${pos.dx}px, ${pos.dy}px)`,
        cursor: onActivate ? "pointer" : "grab",
        touchAction: "none",
        zIndex: dragging ? 10 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
    >
      <div
        style={{
          width: 1,
          height: threadLength,
          background: threadColor,
          opacity: 0.6,
        }}
      />
      <div className="hanging-sway" style={cardStyle}>
        {text}
        {hint && (
          <span
            style={{
              display: "block",
              fontSize: "0.62rem",
              opacity: 0.5,
              marginTop: 2,
            }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
