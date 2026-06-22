import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  vx: number;
  vy: number;
};

function makeStars(width: number, height: number, count: number): Star[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const drift = 2 + Math.random() * 4;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      vx: Math.cos(angle) * drift,
      vy: Math.sin(angle) * drift,
    };
  });
}

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

    let stars = makeStars(width, height, 140);

    const moon = { cx: width * 0.7, cy: height * 0.28 };
    function updateMoonPosition() {
      moon.cx = width * 0.7;
      moon.cy = height * 0.28;
    }
    let radius = Math.min(width, height) * 0.085;

    const mouse = { x: -9999, y: -9999, hover: false };
    let phaseBoost = 0;
    const pulses: { life: number }[] = [];

    function distanceToMoon(x: number, y: number) {
      return Math.hypot(x - moon.cx, y - moon.cy);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.hover = distanceToMoon(mouse.x, mouse.y) < radius * 1.3;
    }
    function onClick(e: MouseEvent) {
      if (distanceToMoon(e.clientX, e.clientY) < radius * 1.4) {
        phaseBoost = Math.min(phaseBoost + 0.025, 0.12);
        pulses.push({ life: 1 });
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    const start = performance.now();
    let phaseTime = 0;
    let lastNow = start;
    let raf: number;

    function frame(now: number) {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const t = (now - start) / 1000;

      phaseBoost *= 0.985;
      phaseTime += dt * (0.05 + phaseBoost);

      const sky = ctx!.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#04050d");
      sky.addColorStop(1, "#0b0f1f");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, width, height);

      for (const star of stars) {
        star.x += star.vx * dt;
        star.y += star.vy * dt;
        if (star.x < 0) star.x += width;
        else if (star.x > width) star.x -= width;
        if (star.y < 0) star.y += height;
        else if (star.y > height) star.y -= height;

        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
        ctx!.fillStyle = `rgba(255, 255, 245, ${twinkle})`;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // slow sine cycle: eases toward full and toward new rather than
      // moving at constant speed, so it visibly lingers near "full".
      // clicking the moon nudges phaseTime forward, speeding the cycle.
      const illum = 0.5 + 0.5 * Math.sin(phaseTime - Math.PI / 2);
      const hoverBoost = mouse.hover ? 0.12 : 0;

      const glowStrength = 0.22 * (0.3 + illum * 0.7) + hoverBoost;
      const glow = ctx!.createRadialGradient(moon.cx, moon.cy, 0, moon.cx, moon.cy, radius * 4.5);
      glow.addColorStop(0, `rgba(245, 240, 220, ${glowStrength})`);
      glow.addColorStop(1, "rgba(245, 240, 220, 0)");
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(moon.cx, moon.cy, radius * 4.5, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(moon.cx, moon.cy, radius, 0, Math.PI * 2);
      ctx!.clip();
      ctx!.fillStyle = "#f3eddd";
      ctx!.fillRect(moon.cx - radius, moon.cy - radius, radius * 2, radius * 2);

      const offsetX = (1 - illum) * radius * 2.1;
      ctx!.fillStyle = "#0b0f1f";
      ctx!.beginPath();
      ctx!.arc(moon.cx + offsetX, moon.cy, radius * 1.02, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      // click ripples expanding outward from the moon's edge
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.life -= dt * 1.3;
        if (p.life <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        const ringRadius = radius * (1 + (1 - p.life) * 1.4);
        ctx!.strokeStyle = `rgba(245, 240, 220, ${p.life * 0.5})`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(moon.cx, moon.cy, ringRadius, 0, Math.PI * 2);
        ctx!.stroke();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      radius = Math.min(width, height) * 0.085;
      updateMoonPosition();
      stars = makeStars(width, height, 140);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
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
