import { useEffect, useRef } from "react";

type Props = {
  tint?: string;
};

export function FilmGrainFlicker({ tint = "#d8d8d8" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let scratchX = Math.random() * width;
    let scratchLife = 0;

    let raf: number;
    function frame() {
      ctx!.fillStyle = "#0c0c0c";
      ctx!.fillRect(0, 0, width, height);

      const flicker = 0.85 + Math.random() * 0.15;
      ctx!.globalAlpha = flicker;

      ctx!.fillStyle = tint;
      const grainCount = 900;
      for (let i = 0; i < grainCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const s = Math.random() * 1.6;
        ctx!.globalAlpha = flicker * Math.random() * 0.5;
        ctx!.fillRect(x, y, s, s);
      }

      scratchLife -= 1;
      if (scratchLife <= 0) {
        scratchX = Math.random() * width;
        scratchLife = 6 + Math.random() * 30;
      }
      ctx!.globalAlpha = 0.18;
      ctx!.strokeStyle = tint;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(scratchX, 0);
      ctx!.lineTo(scratchX + (Math.random() - 0.5) * 6, height);
      ctx!.stroke();

      const vignette = ctx!.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.2,
        width / 2,
        height / 2,
        height * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = vignette;
      ctx!.fillRect(0, 0, width, height);

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
