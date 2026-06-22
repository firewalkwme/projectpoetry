import { useEffect, useRef } from "react";

type Vortex = { cx: number; cy: number; strength: number; sign: number };

type Particle = { x: number; y: number; life: number; maxLife: number };

type Props = {
  tint?: string;
};

function spawnParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    life: 0,
    maxLife: 60 + Math.random() * 120,
  };
}

export function FlowFieldBackground({ tint = "#ffffff" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const vortices: Vortex[] = Array.from({ length: 4 }, () => ({
      cx: Math.random() * width,
      cy: Math.random() * height,
      strength: 80 + Math.random() * 160,
      sign: Math.random() > 0.5 ? 1 : -1,
    }));

    const particles: Particle[] = Array.from({ length: 700 }, () =>
      spawnParticle(width, height)
    );

    function fieldAngle(x: number, y: number): number {
      let dx = 0;
      let dy = 0;
      for (const v of vortices) {
        const ddx = x - v.cx;
        const ddy = y - v.cy;
        const falloff = v.strength / (ddx * ddx + ddy * ddy + 2000);
        dx += -ddy * falloff * v.sign;
        dy += ddx * falloff * v.sign;
      }
      return Math.atan2(dy, dx);
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    let raf: number;
    function frame() {
      ctx!.fillStyle = "rgba(0,0,0,0.045)";
      ctx!.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const angle = fieldAngle(p.x, p.y);
        const speed = 1.6;
        const nx = p.x + Math.cos(angle) * speed;
        const ny = p.y + Math.sin(angle) * speed;

        const lifeRatio = p.life / p.maxLife;
        const opacity = Math.max(0.55 * (1 - Math.abs(lifeRatio - 0.5) * 2), 0);

        ctx!.strokeStyle = tint;
        ctx!.globalAlpha = opacity;
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
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, width, height);
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        display: "block",
      }}
    />
  );
}
