import { useEffect, useRef } from "react";

type Vortex = {
  cx: number;
  cy: number;
  strength: number;
  sign: number;
  decay?: number;
};

type Particle = { x: number; y: number; life: number; maxLife: number };

type Props = {
  tint?: string;
  cornersOnly?: boolean;
};

const CORNER_MASK = `
  radial-gradient(circle at top left, black 0%, transparent 38%),
  radial-gradient(circle at top right, black 0%, transparent 38%),
  radial-gradient(circle at bottom left, black 0%, transparent 38%),
  radial-gradient(circle at bottom right, black 0%, transparent 38%)
`;

function spawnParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    life: 0,
    maxLife: 60 + Math.random() * 120,
  };
}

export function FlowFieldBackground({ tint = "#ffffff", cornersOnly = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const ambientVortices: Vortex[] = Array.from({ length: 3 }, () => ({
      cx: Math.random() * width,
      cy: Math.random() * height,
      strength: 60 + Math.random() * 100,
      sign: Math.random() > 0.5 ? 1 : -1,
    }));

    const burstVortices: Vortex[] = [];

    const mouse = { x: width / 2, y: height / 2, active: false, sign: 1, strength: 260 };

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }

    function onMouseDown(e: MouseEvent) {
      const sign = e.button === 2 ? -1 : 1;
      burstVortices.push({
        cx: e.clientX,
        cy: e.clientY,
        strength: 1400,
        sign,
        decay: 0.96,
      });
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);

    const particles: Particle[] = Array.from({ length: 700 }, () =>
      spawnParticle(width, height)
    );

    function fieldAngle(x: number, y: number): number {
      let dx = 0;
      let dy = 0;

      for (const v of ambientVortices) {
        const ddx = x - v.cx;
        const ddy = y - v.cy;
        const falloff = v.strength / (ddx * ddx + ddy * ddy + 2000);
        dx += -ddy * falloff * v.sign;
        dy += ddx * falloff * v.sign;
      }

      if (mouse.active) {
        const ddx = x - mouse.x;
        const ddy = y - mouse.y;
        const falloff = mouse.strength / (ddx * ddx + ddy * ddy + 2000);
        dx += -ddy * falloff * mouse.sign;
        dy += ddx * falloff * mouse.sign;
      }

      for (const v of burstVortices) {
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

      for (let i = burstVortices.length - 1; i >= 0; i--) {
        const v = burstVortices[i];
        v.strength *= v.decay ?? 0.95;
        if (v.strength < 4) burstVortices.splice(i, 1);
      }

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
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
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
        WebkitMaskImage: cornersOnly ? CORNER_MASK : undefined,
        maskImage: cornersOnly ? CORNER_MASK : undefined,
      }}
    />
  );
}
