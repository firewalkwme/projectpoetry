import { useEffect, useRef } from "react";
import { createRng } from "../lib/seededRandom";
import type { LifeformSpec } from "../lib/lifeform";

type Node = {
  baseAngle: number;
  length: number;
  thickness: number;
  depth: number;
  phase: number;
  delay: number;
  isTip: boolean;
  glows: boolean;
  children: Node[];
};

type Props = {
  spec: LifeformSpec;
};

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${a[0] + (b[0] - a[0]) * t}, ${a[1] + (b[1] - a[1]) * t}, ${a[2] + (b[2] - a[2]) * t})`;
}

function buildRoot(spec: LifeformSpec, rng: () => number, rootLength: number): Node {
  function grow(depth: number, length: number, thickness: number): Node {
    const isTip = depth >= spec.depth || length < 5;
    const node: Node = {
      baseAngle: 0,
      length,
      thickness,
      depth,
      phase: rng() * Math.PI * 2,
      delay: depth * 0.16,
      isTip,
      glows: isTip && rng() < spec.glowDensity,
      children: [],
    };
    if (isTip) return node;

    const forks = rng() < spec.forkChance ? 2 : 1;
    for (let i = 0; i < forks; i++) {
      const sign = i === 0 ? -1 : 1;
      const spread = sign * (0.18 + rng() * spec.curl * 0.9);
      const child = grow(
        depth + 1,
        length * spec.decay * (0.8 + rng() * 0.4),
        thickness * spec.decay
      );
      child.baseAngle = spread;
      node.children.push(child);
    }
    return node;
  }

  return grow(0, rootLength, spec.thickness);
}

export function OrganicLifeform({ spec }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasRef.current;
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
    const roots: { node: Node; startX: number; startAngle: number; rootLength: number }[] = [];
    for (let r = 0; r < spec.rootCount; r++) {
      const startX =
        width * (0.12 + 0.76 * (spec.rootCount > 1 ? r / (spec.rootCount - 1) : 0.5));
      const startAngle = -Math.PI / 2 + (rng() - 0.5) * 0.5;
      const rootLength = height * (0.18 + rng() * 0.08);
      roots.push({ node: buildRoot(spec, rng, rootLength), startX, startAngle, rootLength });
    }

    const colorA = hexToRgb(spec.palette[0]);
    const colorB = hexToRgb(spec.palette[1]);
    const colorC = hexToRgb(spec.palette[2]);

    const mouse = { x: width / 2, y: height / 2 };
    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    window.addEventListener("mousemove", onMouseMove);

    const start = performance.now();
    let raf: number;

    function drawNode(
      node: Node,
      x0: number,
      y0: number,
      angle: number,
      t: number,
      leanBias: number
    ) {
      const growthProgress = Math.max(
        0,
        Math.min(1, (t - node.delay) / (0.5 / spec.growthSpeed))
      );
      if (growthProgress <= 0) return;

      const sway =
        Math.sin(t * (0.6 + spec.swayAmount) + node.phase) *
        spec.swayAmount *
        (0.3 + node.depth * 0.12);
      const actualAngle = angle + node.baseAngle + sway + leanBias * (node.depth / spec.depth);

      const len = node.length * growthProgress;
      const x1 = x0 + Math.cos(actualAngle) * len;
      const y1 = y0 + Math.sin(actualAngle) * len;

      const depthRatio = node.depth / spec.depth;
      ctx!.strokeStyle = lerpColor(colorA, colorB, depthRatio);
      ctx!.lineWidth = Math.max(node.thickness * (0.4 + growthProgress * 0.6), 0.6);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(x0, y0);
      ctx!.lineTo(x1, y1);
      ctx!.stroke();

      if (node.isTip && growthProgress >= 0.98) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + node.phase);
        if (node.glows) {
          const radius = 3 + pulse * 4;
          const gradient = ctx!.createRadialGradient(x1, y1, 0, x1, y1, radius * 3);
          gradient.addColorStop(0, `rgba(${colorC[0]}, ${colorC[1]}, ${colorC[2]}, ${0.55 * pulse})`);
          gradient.addColorStop(1, `rgba(${colorC[0]}, ${colorC[1]}, ${colorC[2]}, 0)`);
          ctx!.fillStyle = gradient;
          ctx!.beginPath();
          ctx!.arc(x1, y1, radius * 3, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      for (const child of node.children) {
        drawNode(child, x1, y1, actualAngle, t, leanBias);
      }
    }

    function frame(now: number) {
      const t = ((now - start) / 1000) * spec.growthSpeed;

      ctx!.fillStyle = "#05060a";
      ctx!.fillRect(0, 0, width, height);

      const vignette = ctx!.createRadialGradient(
        width / 2,
        height * 0.6,
        height * 0.1,
        width / 2,
        height * 0.6,
        height * 0.9
      );
      vignette.addColorStop(0, `rgba(${colorC[0]}, ${colorC[1]}, ${colorC[2]}, 0.06)`);
      vignette.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx!.fillStyle = vignette;
      ctx!.fillRect(0, 0, width, height);

      const leanBias = ((mouse.x / width) - 0.5) * 0.5;

      for (const root of roots) {
        drawNode(root.node, root.startX, height, root.startAngle, t, leanBias);
      }

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
      window.removeEventListener("mousemove", onMouseMove);
      container.removeChild(canvas);
    };
  }, [spec]);

  return (
    <div
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}
    />
  );
}
