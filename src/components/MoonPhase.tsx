import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
};

export function MoonPhase() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let stars: Star[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }));

    const start = performance.now();
    let raf: number;

    function frame(now: number) {
      const t = (now - start) / 1000;

      const sky = ctx!.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#04050d");
      sky.addColorStop(1, "#0b0f1f");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
        ctx!.fillStyle = `rgba(255, 255, 245, ${twinkle})`;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      const cx = width * 0.7;
      const cy = height * 0.28;
      const radius = Math.min(width, height) * 0.085;

      // slow sine cycle: eases toward full and toward new rather than
      // moving at constant speed, so it visibly lingers near "full"
      const illum = 0.5 + 0.5 * Math.sin(t * 0.05 - Math.PI / 2);

      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius * 4.5);
      glow.addColorStop(0, `rgba(245, 240, 220, ${0.22 * (0.3 + illum * 0.7)})`);
      glow.addColorStop(1, "rgba(245, 240, 220, 0)");
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius * 4.5, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.clip();
      ctx!.fillStyle = "#f3eddd";
      ctx!.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      const offsetX = (1 - illum) * radius * 2.1;
      ctx!.fillStyle = "#0b0f1f";
      ctx!.beginPath();
      ctx!.arc(cx + offsetX, cy, radius * 1.02, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      stars = Array.from({ length: 140 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      }));
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}
    />
  );
}
