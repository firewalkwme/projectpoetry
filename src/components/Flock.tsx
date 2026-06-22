import { useEffect, useRef } from "react";
import { createRng } from "../lib/seededRandom";
import type { FlockSpec } from "../lib/flock";

type Boid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  flapSpeed: number;
  color: [number, number, number];
  startleX: number;
  startleY: number;
  startleLife: number;
};

type Props = {
  spec: FlockSpec;
};

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const NEIGHBOR_RADIUS = 110;
const SEPARATION_RADIUS = 38;
const MOUSE_FLEE_RADIUS = 140;
const CLICK_SCARE_RADIUS = 220;

export function Flock({ spec }: Props) {
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

    const boids: Boid[] = Array.from({ length: spec.count }, () => {
      const angle = rng() * Math.PI * 2;
      return {
        x: rng() * width,
        y: rng() * height,
        vx: Math.cos(angle) * spec.speed,
        vy: Math.sin(angle) * spec.speed,
        phase: rng() * Math.PI * 2,
        flapSpeed: 4 + rng() * 3,
        color: colors[Math.floor(rng() * colors.length)],
        startleX: 0,
        startleY: 0,
        startleLife: 0,
      };
    });

    const mouse = { x: -9999, y: -9999, active: false };
    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onMouseLeave() {
      mouse.active = false;
    }
    function onClick(e: MouseEvent) {
      for (const b of boids) {
        const dx = b.x - e.clientX;
        const dy = b.y - e.clientY;
        const dist = Math.hypot(dx, dy);
        if (dist < CLICK_SCARE_RADIUS) {
          const force = (1 - dist / CLICK_SCARE_RADIUS) * 5;
          const nx = dist > 0.01 ? dx / dist : Math.cos(Math.random() * Math.PI * 2);
          const ny = dist > 0.01 ? dy / dist : Math.sin(Math.random() * Math.PI * 2);
          b.startleX = nx * force;
          b.startleY = ny * force;
          b.startleLife = 0.7;
        }
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("click", onClick);

    let raf: number;
    let lastTime: number | null = null;
    const start = performance.now();

    function drawBird(b: Boid, t: number) {
      const heading = Math.atan2(b.vy, b.vx);
      const flap = Math.sin(t * b.flapSpeed + b.phase) * 0.55;
      const size = 9;

      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(heading);
      ctx!.strokeStyle = `rgb(${b.color[0]}, ${b.color[1]}, ${b.color[2]})`;
      ctx!.lineWidth = 1.6;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(-size, -size * (0.7 + flap));
      ctx!.lineTo(0, 0);
      ctx!.lineTo(-size, size * (0.7 + flap));
      ctx!.stroke();
      ctx!.restore();
    }

    function drawFish(b: Boid, t: number) {
      const heading = Math.atan2(b.vy, b.vx);
      const wiggle = Math.sin(t * 5 + b.phase) * 0.4;
      const len = 11;

      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(heading);
      ctx!.fillStyle = `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0.85)`;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, len, len * 0.38, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.moveTo(-len, 0);
      ctx!.lineTo(-len - 6, -5 + wiggle * 6);
      ctx!.lineTo(-len - 6, 5 + wiggle * 6);
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }

    function frame(now: number) {
      const last = lastTime ?? now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastTime = now;
      const t = (now - start) / 1000;

      ctx!.fillStyle = "rgba(4,6,10,0.18)";
      ctx!.fillRect(0, 0, width, height);

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];

        let sepX = 0;
        let sepY = 0;
        let aliVX = 0;
        let aliVY = 0;
        let cohX = 0;
        let cohY = 0;
        let neighborCount = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const o = boids[j];
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const dist = Math.hypot(dx, dy);
          if (dist < NEIGHBOR_RADIUS && dist > 0.001) {
            aliVX += o.vx;
            aliVY += o.vy;
            cohX += o.x;
            cohY += o.y;
            neighborCount++;
            if (dist < SEPARATION_RADIUS) {
              sepX += (dx / dist) * (1 - dist / SEPARATION_RADIUS);
              sepY += (dy / dist) * (1 - dist / SEPARATION_RADIUS);
            }
          }
        }

        let ax = sepX * 220;
        let ay = sepY * 220;

        if (neighborCount > 0) {
          ax += (aliVX / neighborCount - b.vx) * 0.6;
          ay += (aliVY / neighborCount - b.vy) * 0.6;
          ax += (cohX / neighborCount - b.x) * 0.4 * spec.cohesion;
          ay += (cohY / neighborCount - b.y) * 0.4 * spec.cohesion;
        }

        if (mouse.active) {
          const dx = b.x - mouse.x;
          const dy = b.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_FLEE_RADIUS && dist > 0.001) {
            const force = (1 - dist / MOUSE_FLEE_RADIUS) * 260;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        if (b.startleLife > 0) {
          ax += b.startleX * 900;
          ay += b.startleY * 900;
          b.startleLife -= dt;
        }

        ax += (Math.random() - 0.5) * spec.turbulence * 120;
        ay += (Math.random() - 0.5) * spec.turbulence * 120;

        b.vx += ax * dt;
        b.vy += ay * dt;

        const speed = Math.hypot(b.vx, b.vy);
        const maxSpeed = spec.speed * (b.startleLife > 0 ? 2.4 : 1.3);
        const minSpeed = spec.speed * 0.5;
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        } else if (speed < minSpeed && speed > 0.001) {
          b.vx = (b.vx / speed) * minSpeed;
          b.vy = (b.vy / speed) * minSpeed;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // wrap around edges so the flock keeps flowing rather than
        // bouncing off walls -- reads as continuous, living motion
        const margin = 30;
        if (b.x < -margin) b.x = width + margin;
        else if (b.x > width + margin) b.x = -margin;
        if (b.y < -margin) b.y = height + margin;
        else if (b.y > height + margin) b.y = -margin;

        if (spec.kind === "bird") drawBird(b, t);
        else drawFish(b, t);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, width, height);

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
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
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
