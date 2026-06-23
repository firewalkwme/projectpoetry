import type p5 from "p5";
import type { PaintingPlan } from "./poemPainting";

export type PoemSketchOptions = {
  plan: PaintingPlan;
  palette: string[];
  onBloom?: () => void;
};

const FORM_DURATION = 16; // seconds for the painting to fully assemble

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createPoemSketch(opts: PoemSketchOptions) {
  return (p: p5) => {
    let width = p.windowWidth;
    let height = p.windowHeight;
    const { plan, palette } = opts;

    let startMs = 0;
    const blooms: { cx: number; cy: number; r: number; life: number }[] = [];

    function clusterColor(i: number): p5.Color {
      return p.color(palette[i % palette.length]);
    }

    function clusterProgress(i: number, globalT: number): number {
      const start = (i / plan.clusters.length) * 0.5;
      return easeOutCubic(Math.max(0, Math.min(1, (globalT - start) / (1 - start))));
    }

    p.setup = () => {
      const canvas = p.createCanvas(width, height);
      canvas.style("position", "fixed");
      canvas.style("inset", "0");
      canvas.style("z-index", "-1");
      p.textFont("Georgia, serif");
      p.textAlign(p.CENTER, p.CENTER);
      p.noiseSeed(plan.seed);
      startMs = p.millis();
    };

    p.windowResized = () => {
      width = p.windowWidth;
      height = p.windowHeight;
      p.resizeCanvas(width, height);
    };

    p.mousePressed = () => {
      blooms.push({ cx: p.mouseX, cy: p.mouseY, r: 0, life: 1 });
      opts.onBloom?.();
    };

    function drawBackdrop(t: number) {
      const base = p.color(palette[palette.length - 1]);
      p.noStroke();
      p.fill(p.red(base) * 0.5, p.green(base) * 0.5, p.blue(base) * 0.5);
      p.rect(0, 0, width, height);

      for (let i = 0; i < palette.length; i++) {
        const col = p.color(palette[i]);
        const wx = width * (0.2 + 0.6 * ((Math.sin(t * 0.02 + i * 2.1) + 1) / 2));
        const wy = height * (0.2 + 0.6 * ((Math.cos(t * 0.017 + i * 1.7) + 1) / 2));
        const r = Math.max(width, height) * 0.4;
        for (let ring = r; ring > 0; ring -= r / 6) {
          const a = 6 * (1 - ring / r);
          p.fill(p.red(col), p.green(col), p.blue(col), a);
          p.circle(wx, wy, ring * 2);
        }
      }
    }

    function drawBlob(cx: number, cy: number, radius: number, seed: number, t: number, progress: number, col: p5.Color) {
      const points = 28;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * p.TWO_PI;
        const wobble = p.noise(seed * 0.01 + Math.cos(a) * 1.3, seed * 0.01 + Math.sin(a) * 1.3, t * 0.04);
        const r = radius * (0.72 + wobble * 0.5) * progress;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }

      p.noStroke();
      p.fill(p.red(col), p.green(col), p.blue(col), 150 * progress);
      p.beginShape();
      for (const pt of pts) p.vertex(pt.x, pt.y);
      p.endShape(p.CLOSE);

      p.fill(255, 255, 245, 35 * progress);
      p.circle(cx - radius * 0.15, cy - radius * 0.2, radius * 0.5);
    }

    function drawTendrils(cx: number, cy: number, radius: number, count: number, seed: number, t: number, progress: number, col: p5.Color) {
      p.noFill();
      p.stroke(p.red(col), p.green(col), p.blue(col), 160 * progress);
      p.strokeWeight(1.4);
      for (let k = 0; k < count; k++) {
        const baseAngle = (k / count) * p.TWO_PI + seed * 0.001;
        const dir = k % 2 === 0 ? 1 : -1;
        const turns = 1.6 + (seed % 5) * 0.15;
        const samples = 18;
        p.beginShape();
        for (let i = 0; i <= samples; i++) {
          const frac = (i / samples) * progress;
          const theta = frac * Math.PI * turns * dir;
          const rr = radius * (1 + frac * 1.8);
          const wob = p.noise(seed * 0.02 + k, t * 0.03 + i * 0.2) * radius * 0.3;
          const angle = baseAngle + theta + t * 0.01 * dir;
          const x = cx + Math.cos(angle) * (rr + wob);
          const y = cy + Math.sin(angle) * (rr + wob);
          p.vertex(x, y);
        }
        p.endShape();
      }
      p.noStroke();
    }

    function drawOrb(cx: number, cy: number, radius: number, angle: number, t: number, progress: number, col: p5.Color) {
      const ox = cx + Math.cos(angle) * radius * 1.4;
      const oy = cy + Math.sin(angle) * radius * 1.4;
      const orbR = radius * 0.42 * progress;
      const pulse = 1 + Math.sin(t * 0.6 + angle) * 0.05;
      for (let ring = 3; ring > 0; ring--) {
        const a = ring % 2 === 0 ? col : p.color(255, 250, 240);
        p.fill(p.red(a), p.green(a), p.blue(a), (60 + ring * 30) * progress);
        p.circle(ox, oy, orbR * pulse * (ring / 3) * 2);
      }
      p.fill(20, 18, 24, 200 * progress);
      p.circle(ox, oy, orbR * 0.35);
    }

    function drawDots(cx: number, cy: number, radius: number, dots: PaintingPlan["clusters"][number]["dotPositions"], t: number, progress: number, col: p5.Color) {
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const reveal = Math.max(0, Math.min(1, (progress - i / dots.length / 3) * 3));
        if (reveal <= 0) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 1.2 + d.phase);
        p.fill(p.red(col), p.green(col), p.blue(col), 180 * reveal * twinkle);
        p.circle(cx + d.x * radius, cy + d.y * radius, d.size * (0.6 + twinkle * 0.6));
      }
    }

    p.draw = () => {
      const now = p.millis();
      const t = now / 1000;
      const elapsed = (now - startMs) / 1000;
      const globalT = Math.min(1, elapsed / FORM_DURATION);

      drawBackdrop(t);

      const centers = plan.clusters.map((c) => ({ x: c.x * width, y: c.y * height, r: Math.min(width, height) * c.radius }));

      // filaments connecting clusters, so the piece reads as one composition
      // rather than isolated islands -- "everything coming together"
      const filamentProgress = Math.max(0, Math.min(1, (globalT - 0.55) / 0.4));
      if (filamentProgress > 0) {
        p.noFill();
        const lineCol = p.color(palette[0]);
        p.stroke(p.red(lineCol), p.green(lineCol), p.blue(lineCol), 70 * filamentProgress);
        p.strokeWeight(1);
        for (const [a, b] of plan.filaments) {
          const A = centers[a];
          const B = centers[b];
          const midX = (A.x + B.x) / 2 + Math.sin(t * 0.1 + a) * 30;
          const midY = (A.y + B.y) / 2 + Math.cos(t * 0.1 + b) * 30;
          p.bezier(A.x, A.y, midX, midY, midX, midY, B.x, B.y);
        }
        p.noStroke();
      }

      plan.clusters.forEach((cluster, i) => {
        const progress = clusterProgress(i, globalT);
        if (progress <= 0) return;
        const cx = cluster.x * width;
        const cy = cluster.y * height;
        const radius = Math.min(width, height) * cluster.radius;
        const col = clusterColor(i);

        drawTendrils(cx, cy, radius, cluster.tendrils, cluster.seed, t, progress, col);
        drawDots(cx, cy, radius, cluster.dotPositions, t, progress, col);
        drawBlob(cx, cy, radius, cluster.seed, t, progress, col);
        if (cluster.hasOrb) drawOrb(cx, cy, radius, cluster.orbAngle, t, progress, col);

        if (cluster.words.length > 0 && progress > 0.6) {
          const labelAlpha = (progress - 0.6) / 0.4;
          p.fill(255, 250, 240, 200 * labelAlpha);
          p.textSize(11 + radius * 0.03);
          p.textStyle(p.ITALIC);
          const ringRadius = radius * 1.7;
          cluster.words.forEach((word, wi) => {
            const wordAngle = (wi / cluster.words.length) * p.TWO_PI + cluster.seed * 0.0007;
            const wx = cx + Math.cos(wordAngle) * ringRadius;
            const wy = cy + Math.sin(wordAngle) * ringRadius * 0.85;
            p.text(word, wx, wy);
          });
          p.textStyle(p.NORMAL);
        }
      });

      // click-triggered blooms: a soft expanding ring of light, the
      // "decipher / play with it" interaction
      for (let i = blooms.length - 1; i >= 0; i--) {
        const b = blooms[i];
        b.life -= 0.016;
        b.r += 6;
        if (b.life <= 0) {
          blooms.splice(i, 1);
          continue;
        }
        p.noFill();
        p.stroke(255, 250, 240, b.life * 120);
        p.strokeWeight(1.5);
        p.circle(b.cx, b.cy, b.r * 2);
        p.noStroke();
      }
    };
  };
}
