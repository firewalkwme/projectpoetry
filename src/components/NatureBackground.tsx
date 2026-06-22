import { useEffect, useRef } from "react";
import { createRng } from "../lib/seededRandom";
import type { ElementalKind, ElementalSpec } from "../lib/elemental";

type Props = {
  spec: ElementalSpec;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
};

type KindConfig = {
  gravityX: number;
  gravityY: number;
  jitter: number;
  baseCount: number;
  sizeMin: number;
  sizeMax: number;
  shape: "line" | "circle" | "leaf" | "blob";
  glow: boolean;
};

const KIND_CONFIG: Record<ElementalKind, KindConfig> = {
  rain: { gravityX: 25, gravityY: 420, jitter: 8, baseCount: 160, sizeMin: 8, sizeMax: 18, shape: "line", glow: false },
  embers: { gravityX: 0, gravityY: -45, jitter: 22, baseCount: 70, sizeMin: 1.5, sizeMax: 3.2, shape: "circle", glow: true },
  leaves: { gravityX: 18, gravityY: 55, jitter: 30, baseCount: 36, sizeMin: 5, sizeMax: 9, shape: "leaf", glow: false },
  motes: { gravityX: 0, gravityY: -10, jitter: 16, baseCount: 50, sizeMin: 1.5, sizeMax: 3, shape: "circle", glow: true },
  smoke: { gravityX: 6, gravityY: -22, jitter: 8, baseCount: 22, sizeMin: 30, sizeMax: 60, shape: "blob", glow: false },
};

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function NatureBackground({ spec }: Props) {
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

    const rng = createRng(spec.seed);
    const colors = spec.palette.map(hexToRgb);
    const config = KIND_CONFIG[spec.kind];

    // soft drifting color blobs behind the particles, derived from the
    // poem's own top themes -- an abstract, blurred nature texture
    const blobs = Array.from({ length: 4 }, () => ({
      x: rng() * width,
      y: rng() * height,
      r: height * (0.3 + rng() * 0.35),
      color: colors[Math.floor(rng() * colors.length)],
      phase: rng() * Math.PI * 2,
      speed: 0.05 + rng() * 0.08,
    }));

    function spawnParticle(): Particle {
      return {
        x: rng() * width,
        y: rng() * height,
        vx: (rng() - 0.5) * config.jitter,
        vy: (rng() - 0.5) * config.jitter,
        life: rng() * 100,
        maxLife: 200 + rng() * 200,
        size: config.sizeMin + rng() * (config.sizeMax - config.sizeMin),
        rotation: rng() * Math.PI * 2,
      };
    }

    let particles: Particle[] = Array.from(
      { length: Math.round(config.baseCount * spec.intensity) },
      spawnParticle
    );

    let boost = 0;
    function onClick() {
      boost = Math.min(boost + 1, 3);
      const target = Math.round(config.baseCount * spec.intensity * (1 + boost * 0.6));
      while (particles.length < target) particles.push(spawnParticle());
    }
    window.addEventListener("click", onClick);

    let raf: number;
    let t = 0;

    function frame() {
      boost = Math.max(0, boost - 0.004);
      const speedMul = spec.speed * (1 + boost * 0.8);

      ctx!.fillStyle = "#07090b";
      ctx!.fillRect(0, 0, width, height);

      for (const b of blobs) {
        const bx = b.x + Math.sin(t * b.speed + b.phase) * 60;
        const by = b.y + Math.cos(t * b.speed * 0.8 + b.phase) * 40;
        const gradient = ctx!.createRadialGradient(bx, by, 0, bx, by, b.r);
        gradient.addColorStop(0, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0.16)`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, width, height);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const fade = Math.min(lifeRatio * 4, 1, (1 - lifeRatio) * 4);
        const color = colors[i % colors.length];

        p.x += (p.vx + config.gravityX * 0.04) * speedMul;
        p.y += (p.vy + config.gravityY * 0.04) * speedMul;
        p.rotation += 0.01 * speedMul;
        p.life += speedMul;

        if (config.shape === "line") {
          ctx!.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.5 * fade})`;
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - config.gravityX * 0.03, p.y - p.size);
          ctx!.stroke();
        } else if (config.shape === "leaf") {
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rotation);
          ctx!.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.55 * fade})`;
          ctx!.beginPath();
          ctx!.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        } else if (config.shape === "blob") {
          const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.12 * fade})`);
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.fillStyle = gradient;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          if (config.glow) {
            const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.6 * fade})`);
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx!.fillStyle = gradient;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx!.fill();
          }
          ctx!.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.85 * fade})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }

        if (p.life > p.maxLife || p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
          particles[i] = spawnParticle();
        }
      }

      // let boosted particle count gently settle back to baseline
      const baseline = Math.round(config.baseCount * spec.intensity);
      if (particles.length > baseline && boost <= 0.01) {
        particles = particles.slice(0, baseline);
      }

      t += 0.016;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("click", onClick);
      container.removeChild(canvas);
    };
  }, [spec]);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}
    />
  );
}
