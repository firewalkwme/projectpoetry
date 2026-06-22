import { useEffect, useRef } from "react";

type Props = {
  tint?: string;
};

type Stroke = {
  points: { x: number; y: number }[];
  progress: number;
  speed: number;
  fade: number;
};

function makeStroke(w: number, h: number): Stroke {
  const startX = Math.random() * w;
  const startY = Math.random() * h;
  const points = [{ x: startX, y: startY }];
  const segments = 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < segments; i++) {
    const prev = points[points.length - 1];
    points.push({
      x: prev.x + (Math.random() - 0.5) * 140,
      y: prev.y + (Math.random() - 0.5) * 140,
    });
  }
  return { points, progress: 0, speed: 0.01 + Math.random() * 0.02, fade: 1 };
}

export function SketchScribble({ tint = "#2a2a2a" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let strokes: Stroke[] = Array.from({ length: 14 }, () =>
      makeStroke(width, height)
    );

    let raf: number;
    function frame() {
      ctx!.fillStyle = "#f6f3ec";
      ctx!.fillRect(0, 0, width, height);

      ctx!.strokeStyle = tint;
      ctx!.lineWidth = 1.4;
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";

      strokes.forEach((s) => {
        const totalSegments = s.points.length - 1;
        const drawSegments = s.progress * totalSegments;
        ctx!.globalAlpha = s.fade * 0.65;
        ctx!.beginPath();
        ctx!.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i <= Math.floor(drawSegments); i++) {
          ctx!.lineTo(s.points[i].x, s.points[i].y);
        }
        const partial = drawSegments - Math.floor(drawSegments);
        const idx = Math.floor(drawSegments);
        if (idx < totalSegments && partial > 0) {
          const a = s.points[idx];
          const b = s.points[idx + 1];
          ctx!.lineTo(a.x + (b.x - a.x) * partial, a.y + (b.y - a.y) * partial);
        }
        ctx!.stroke();

        if (s.progress < 1) {
          s.progress += s.speed;
        } else {
          s.fade -= 0.01;
        }
      });

      strokes = strokes.filter((s) => s.fade > 0);
      while (strokes.length < 14) {
        strokes.push(makeStroke(width, height));
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [tint]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, display: "block" }}
    />
  );
}
