import { useEffect, useRef } from "react";

type Props = {
  tint?: string;
};

export function WaveLines({ tint = "#1a1a1a" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const lineGap = 9;
    const hillCount = 3;
    const hills = Array.from({ length: hillCount }, (_, i) => ({
      cx: ((i + 0.5) / hillCount) * width,
      amp: 50 + Math.random() * 50,
      freq: 0.6 + Math.random() * 0.4,
    }));

    let raf: number;
    let t = 0;
    function frame() {
      ctx!.fillStyle = "#f4f1ea";
      ctx!.fillRect(0, 0, width, height);

      ctx!.strokeStyle = tint;
      ctx!.lineWidth = 1;
      ctx!.globalAlpha = 0.55;

      for (let y = 0; y < height; y += lineGap) {
        ctx!.beginPath();
        for (let x = 0; x <= width; x += 6) {
          let offset = 0;
          for (const hill of hills) {
            const dist = (x - hill.cx) / (width / hillCount);
            const falloff = Math.exp(-dist * dist * 1.4);
            offset +=
              Math.sin(x * 0.01 * hill.freq + t + y * 0.01) * hill.amp * falloff;
          }
          const yy = y + offset * 0.25;
          if (x === 0) ctx!.moveTo(x, yy);
          else ctx!.lineTo(x, yy);
        }
        ctx!.stroke();
      }

      t += 0.012;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
      hills.forEach((hill, i) => {
        hill.cx = ((i + 0.5) / hillCount) * width;
      });
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
