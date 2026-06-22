import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
};

const PALETTE = ["#1d4ed8", "#0891b2", "#16a34a", "#ca8a04", "#dc2626"];

function spawnParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    life: 0,
    maxLife: 140 + Math.random() * 200,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  };
}

type Props = {
  tint?: string;
};

export function VectorStreamlines(_props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const centers = Array.from({ length: 3 }, () => ({
      cx: Math.random() * width,
      cy: Math.random() * height,
      freq: 0.6 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));

    function fieldAngle(x: number, y: number, t: number): number {
      let dx = 0;
      let dy = 0;
      for (const c of centers) {
        const ddx = (x - c.cx) / 200;
        const ddy = (y - c.cy) / 200;
        dx += Math.sin(ddy * c.freq + t + c.phase);
        dy += Math.cos(ddx * c.freq + t + c.phase);
      }
      return Math.atan2(dy, dx);
    }

    const particles: Particle[] = Array.from({ length: 90 }, () =>
      spawnParticle(width, height)
    );

    ctx.fillStyle = "#f7f7f5";
    ctx.fillRect(0, 0, width, height);

    let raf: number;
    let t = 0;
    function frame() {
      ctx!.fillStyle = "rgba(247,247,245,0.06)";
      ctx!.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const angle = fieldAngle(p.x, p.y, t);
        const speed = 1.3;
        const nx = p.x + Math.cos(angle) * speed;
        const ny = p.y + Math.sin(angle) * speed;

        ctx!.strokeStyle = p.color;
        ctx!.globalAlpha = 0.5;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(nx, ny);
        ctx!.stroke();

        p.x = nx;
        p.y = ny;
        p.life += 1;

        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          particles[i] = spawnParticle(width, height);
        }
      }
      ctx!.globalAlpha = 1;
      t += 0.004;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
      ctx!.fillStyle = "#f7f7f5";
      ctx!.fillRect(0, 0, width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, display: "block" }}
    />
  );
}
