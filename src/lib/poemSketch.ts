import type p5 from "p5";
import type { PaintingPlan } from "./poemPainting";
import type { ShapeCharacter } from "./moodShape";
import type { EnvShot } from "./poemAudio";

export type PoemSketchOptions = {
  plan: PaintingPlan;
  palette: string[];
  shape: ShapeCharacter;
  clusterSounds: EnvShot[];
  onInteract?: (kind: EnvShot) => void;
};

const DRAG_HIT_RADIUS_MUL = 1.8; // x cluster radius
const DISTURB_DECAY = 2.2; // per second
const DISTURB_STRENGTH = 0.55; // fraction of radius pushed on click

type ClusterRuntime = {
  offsetX: number; // persists after drag -- "let me reposition things"
  offsetY: number;
  dragging: boolean;
  dragDX: number;
  dragDY: number;
  pushX: number; // physical disturbance from a click, decays back to 0
  pushY: number;
  regenAt: number; // next time (seconds) a dot in this cluster rerolls
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Gielis superformula: one equation that sweeps through circles, flowers,
// stars, and amoeba-like organic silhouettes. Returns a radius multiplier
// in (0, 1], peaking at the lobe tips.
function superShapeRadius(theta: number, m: number, n1: number, n2: number, n3: number): number {
  const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4)), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4)), n3);
  const denom = Math.pow(t1 + t2, 1 / n1);
  if (!isFinite(denom) || denom === 0) return 0;
  return 1 / denom;
}

export function createPoemSketch(opts: PoemSketchOptions) {
  return (p: p5) => {
    let width = p.windowWidth;
    let height = p.windowHeight;
    const { plan, palette, shape } = opts;
    // p5 2.x replaced curveVertex with splineVertex (same smooth-curve
    // behavior); @types/p5 also doesn't expose it on the class type
    const curveVertex = (x: number, y: number) =>
      (p as unknown as { splineVertex: (x: number, y: number) => void }).splineVertex(x, y);

    // intensity blends mood negativity with the poem's existential weight;
    // it drives how deep and chaotic the fractals grow (calm/neutral stay
    // shallow and soft, intense-negative/existential go deep and wild)
    const intensity = Math.max(0, Math.min(1, shape.negativity * 0.7 + plan.existential * 0.6));
    const fractalDepth = Math.min(6, Math.round(3 + intensity * 2 + plan.lyricism)); // 3..6
    const branchChildren = Math.min(3, 2 + Math.round(plan.lyricism)); // 2..3, lyricism -> intricacy
    const branchChaos = 0.25 + intensity * 0.7;
    const branchSoftness = 1 - intensity * 0.5;

    let startMs = 0;
    let vividPalette: p5.Color[] = [];
    let tipColor: p5.Color;
    let fbm: p5.Graphics | null = null;
    const blooms: { cx: number; cy: number; r: number; life: number }[] = [];
    const runtime: ClusterRuntime[] = plan.clusters.map(() => ({
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      dragDX: 0,
      dragDY: 0,
      pushX: 0,
      pushY: 0,
      regenAt: 3 + Math.random() * 6,
    }));

    let dragIndex = -1;
    let pressX = 0;
    let pressY = 0;
    let moved = false;
    let lastFrameMs = 0;

    // richer jewel tones: push saturation/brightness up a notch while
    // keeping the organic, non-neon feel
    function vivid(hex: string): p5.Color {
      const base = p.color(hex);
      p.colorMode(p.HSB, 360, 100, 100, 255);
      const out = p.color(
        p.hue(base),
        Math.min(100, p.saturation(base) * 1.35 + 8),
        Math.min(100, p.brightness(base) * 1.1 + 5)
      );
      p.colorMode(p.RGB, 255);
      return out;
    }

    function lighten(col: p5.Color, amt: number): p5.Color {
      return p.color(
        p.red(col) + (255 - p.red(col)) * amt,
        p.green(col) + (255 - p.green(col)) * amt,
        p.blue(col) + (255 - p.blue(col)) * amt
      );
    }

    function clusterColor(i: number): p5.Color {
      return vividPalette[i % vividPalette.length];
    }

    function clusterProgress(i: number, globalT: number): number {
      const start = (i / plan.clusters.length) * 0.5;
      return easeOutCubic(Math.max(0, Math.min(1, (globalT - start) / (1 - start))));
    }

    // pre-render a fractal-noise (FBM) cloud texture once; it drifts in the
    // backdrop behind everything as a marble/veined ground
    function buildFbm() {
      const w = 220;
      const h = 220;
      const g = p.createGraphics(w, h);
      g.pixelDensity(1); // index g.pixels as w*h*4 regardless of retina DPR
      g.loadPixels();
      const octaves = 5;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let amp = 1;
          let freq = 0.012;
          let sum = 0;
          let norm = 0;
          for (let o = 0; o < octaves; o++) {
            sum += amp * p.noise(x * freq + 100, y * freq + 100);
            norm += amp;
            amp *= 0.55;
            freq *= 2.1;
          }
          const v = Math.pow(sum / norm, 1.6); // sharpen into veins
          const idx = 4 * (y * w + x);
          g.pixels[idx] = 255;
          g.pixels[idx + 1] = 255;
          g.pixels[idx + 2] = 255;
          g.pixels[idx + 3] = v * 90;
        }
      }
      g.updatePixels();
      return g;
    }

    p.setup = () => {
      const canvas = p.createCanvas(width, height);
      canvas.style("position", "fixed");
      canvas.style("inset", "0");
      canvas.style("z-index", "-1");
      p.textFont("Georgia, serif");
      p.textAlign(p.CENTER, p.CENTER);
      p.noiseSeed(plan.seed);
      vividPalette = palette.map(vivid);
      tipColor = p.color(shape.tip[0], shape.tip[1], shape.tip[2]);
      fbm = buildFbm();
      startMs = p.millis();
      lastFrameMs = startMs;
    };

    p.windowResized = () => {
      width = p.windowWidth;
      height = p.windowHeight;
      p.resizeCanvas(width, height);
    };

    function clusterCenter(i: number) {
      const cluster = plan.clusters[i];
      const rt = runtime[i];
      return {
        cx: cluster.x * width + rt.offsetX,
        cy: cluster.y * height + rt.offsetY,
        radius: Math.min(width, height) * cluster.radius,
      };
    }

    p.mousePressed = () => {
      pressX = p.mouseX;
      pressY = p.mouseY;
      moved = false;

      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < plan.clusters.length; i++) {
        const { cx, cy, radius } = clusterCenter(i);
        const d = p.dist(p.mouseX, p.mouseY, cx, cy);
        if (d < radius * DRAG_HIT_RADIUS_MUL && d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      dragIndex = nearestIdx;
      if (dragIndex >= 0) {
        runtime[dragIndex].dragDX = p.mouseX - (plan.clusters[dragIndex].x * width + runtime[dragIndex].offsetX);
        runtime[dragIndex].dragDY = p.mouseY - (plan.clusters[dragIndex].y * height + runtime[dragIndex].offsetY);
      }
    };

    p.mouseDragged = () => {
      if (p.dist(p.mouseX, p.mouseY, pressX, pressY) > 4) moved = true;
      if (dragIndex >= 0 && moved) {
        const rt = runtime[dragIndex];
        rt.dragging = true;
        rt.offsetX = p.mouseX - rt.dragDX - plan.clusters[dragIndex].x * width;
        rt.offsetY = p.mouseY - rt.dragDY - plan.clusters[dragIndex].y * height;
      }
    };

    p.mouseReleased = () => {
      if (dragIndex >= 0) {
        runtime[dragIndex].dragging = false;
        if (!moved) {
          // a real click (no drag): physically disturb this cluster and
          // fire the environmental sound that matches its content
          const { cx, cy } = clusterCenter(dragIndex);
          const dx = cx - p.mouseX;
          const dy = cy - p.mouseY;
          const len = Math.hypot(dx, dy) || 1;
          const radius = clusterCenter(dragIndex).radius;
          runtime[dragIndex].pushX += (dx / len) * radius * DISTURB_STRENGTH;
          runtime[dragIndex].pushY += (dy / len) * radius * DISTURB_STRENGTH;
          opts.onInteract?.(opts.clusterSounds[dragIndex] ?? opts.clusterSounds[0]);
          blooms.push({ cx: p.mouseX, cy: p.mouseY, r: 0, life: 1 });
        }
      } else if (!moved) {
        blooms.push({ cx: p.mouseX, cy: p.mouseY, r: 0, life: 1 });
      }
      dragIndex = -1;
    };

    function drawBackdrop(t: number) {
      const base = p.color(palette[palette.length - 1]);
      p.noStroke();
      p.fill(p.red(base) * 0.5, p.green(base) * 0.5, p.blue(base) * 0.5);
      p.rect(0, 0, width, height);

      // drifting fractal-noise veins
      if (fbm) {
        const tintCol = vividPalette[0];
        p.push();
        p.tint(p.red(tintCol), p.green(tintCol), p.blue(tintCol), 55);
        const ox = Math.sin(t * 0.012) * 40;
        const oy = Math.cos(t * 0.009) * 40;
        p.image(fbm, -60 + ox, -60 + oy, width + 120, height + 120);
        p.noTint();
        p.pop();
      }

      for (let i = 0; i < palette.length; i++) {
        const col = vividPalette[i];
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

    // recursive coral/lightning growth out of a cluster rim
    function drawBranch(x: number, y: number, angle: number, len: number, weight: number, depth: number, t: number, seed: number, baseCol: p5.Color, alphaMul: number) {
      if (depth <= 0 || len < 3) return;
      const frac = 1 - depth / fractalDepth; // 0 root .. ~1 tip
      const col = p.lerpColor(baseCol, tipColor, frac); // hue shift outward
      const sway = Math.sin(t * 0.5 * shape.speedMul + seed * 0.13 + depth) * 0.18 * branchChaos;
      const a2 = angle + sway;
      const ex = x + Math.cos(a2) * len;
      const ey = y + Math.sin(a2) * len;
      p.stroke(p.red(col), p.green(col), p.blue(col), 150 * alphaMul * (0.45 + frac * 0.55));
      p.strokeWeight(Math.max(0.4, weight));
      p.line(x, y, ex, ey);

      const n = branchChildren;
      const fan = 0.5 + branchChaos;
      for (let i = 0; i < n; i++) {
        const spread = (n === 1 ? 0 : i / (n - 1) - 0.5) * 2 * fan;
        const jitter = Math.sin(seed * 0.07 + i * 2.3 + depth) * 0.25 * branchChaos;
        drawBranch(ex, ey, a2 + spread + jitter, len * (0.58 + 0.1 * branchSoftness), weight * 0.68, depth - 1, t, seed + i * 37 + depth, baseCol, alphaMul);
      }
    }

    function drawFractalBranches(cx: number, cy: number, radius: number, count: number, seed: number, t: number, progress: number, col: p5.Color) {
      if (progress < 0.35) return;
      const starts = Math.min(count, 4);
      const sc = (p as unknown as { strokeCap: (c: unknown) => void; ROUND: unknown });
      sc.strokeCap(sc.ROUND);
      for (let k = 0; k < starts; k++) {
        const lifeCycle = 0.55 + 0.45 * Math.sin(t * 0.05 + k * 1.7 + seed * 0.01);
        if (lifeCycle <= 0.08) continue;
        const baseAngle = (k / starts) * p.TWO_PI + seed * 0.001;
        const sx = cx + Math.cos(baseAngle) * radius * 0.85;
        const sy = cy + Math.sin(baseAngle) * radius * 0.85;
        drawBranch(sx, sy, baseAngle, radius * 0.9 * progress * lifeCycle, 1.6, fractalDepth, t, seed * 7 + k * 101, col, progress * lifeCycle);
      }
      p.noStroke();
    }

    function drawBlob(cx: number, cy: number, radius: number, seed: number, t: number, progress: number, col: p5.Color) {
      const points = 140;
      const pts: { x: number; y: number }[] = [];

      const m = 2 + (seed % 5) + Math.round(shape.jaggedness * 6);
      const n1 = 1.15 - shape.jaggedness * 0.85;
      const n2 = 0.6 + (seed % 3) * 0.2 + plan.lyricism * 0.6;
      const n3 = n2;

      const noiseSpeed = (1.4 - plan.lyricism * 0.8) * (1 + shape.erraticism * 1.2) * shape.speedMul;
      const breathAmt = 0.18 + shape.jaggedness * 0.25;
      const bouncePulse = 1 + shape.bounce * Math.sin(t * 2.2 * shape.speedMul + seed);

      for (let i = 0; i <= points; i++) {
        const a = (i / points) * p.TWO_PI;
        const sr = superShapeRadius(a, m, n1, n2, n3);
        const breath = 1 + (p.noise(seed * 0.01 + Math.cos(a) * 1.1, seed * 0.01 + Math.sin(a) * 1.1, t * 0.05 * noiseSpeed) - 0.5) * breathAmt;
        const r = radius * sr * breath * progress * bouncePulse;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }

      const body = lighten(col, 0.22);
      p.noStroke();
      p.fill(p.red(body), p.green(body), p.blue(body), 185 * progress);
      p.beginShape();
      for (const pt of pts) curveVertex(pt.x, pt.y);
      p.endShape(p.CLOSE);

      // nested self-similar shells (fractal "shape within shape")
      const nestCol = p.lerpColor(body, tipColor, 0.5);
      p.noFill();
      p.stroke(p.red(nestCol), p.green(nestCol), p.blue(nestCol), 95 * progress);
      p.strokeWeight(1);
      for (const s of [0.62, 0.34]) {
        p.beginShape();
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * p.TWO_PI;
          const sr = superShapeRadius(a, m, n1, n2, n3);
          const r = radius * sr * s * progress * bouncePulse;
          curveVertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        p.endShape(p.CLOSE);
      }

      // bright rim so the silhouette stays legible on the dark backdrop
      const rim = lighten(col, 0.55);
      p.stroke(p.red(rim), p.green(rim), p.blue(rim), 150 * progress);
      p.strokeWeight(1.2);
      p.beginShape();
      for (const pt of pts) curveVertex(pt.x, pt.y);
      p.endShape(p.CLOSE);
      p.noStroke();

      p.fill(255, 255, 245, 28 * progress);
      p.circle(cx - radius * 0.15, cy - radius * 0.2, radius * 0.4);
    }

    function drawOrb(cx: number, cy: number, radius: number, angle: number, t: number, progress: number, col: p5.Color) {
      const ox = cx + Math.cos(angle) * radius * 1.4;
      const oy = cy + Math.sin(angle) * radius * 1.4;
      const orbR = radius * 0.42 * progress;
      const pulse = 1 + Math.sin(t * 0.6 * shape.speedMul + angle) * 0.05;
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
        const twinkle = 0.5 + 0.5 * Math.sin(t * 1.2 * shape.speedMul + d.phase);
        const dot = lighten(col, 0.45);
        p.fill(p.red(dot), p.green(dot), p.blue(dot), 210 * reveal * twinkle);
        p.circle(cx + d.x * radius, cy + d.y * radius, d.size * (0.8 + twinkle * 0.8));
      }
    }

    p.draw = () => {
      const now = p.millis();
      const dt = Math.min(now - lastFrameMs, 50) / 1000;
      lastFrameMs = now;
      const t = now / 1000;
      const elapsed = (now - startMs) / 1000;
      const globalT = Math.min(1, elapsed / plan.formDuration);

      drawBackdrop(t);

      for (let i = 0; i < runtime.length; i++) {
        const rt = runtime[i];
        if (!rt.dragging) {
          rt.pushX *= Math.max(0, 1 - DISTURB_DECAY * dt);
          rt.pushY *= Math.max(0, 1 - DISTURB_DECAY * dt);
        }
        if (globalT >= 1 && t >= rt.regenAt) {
          const dots = plan.clusters[i].dotPositions;
          const idx = Math.floor(Math.random() * dots.length);
          const a = Math.random() * Math.PI * 2;
          const r = 0.3 + Math.random() * 1.5;
          dots[idx] = { x: Math.cos(a) * r, y: Math.sin(a) * r, size: 1 + Math.random() * 2.2, phase: Math.random() * Math.PI * 2 };
          rt.regenAt = t + 3 + Math.random() * 6;
        }
      }

      const centers = plan.clusters.map((_, i) => clusterCenter(i));

      const filamentProgress = Math.max(0, Math.min(1, (globalT - 0.55) / 0.4));
      if (filamentProgress > 0) {
        p.noFill();
        const lineCol = vividPalette[0];
        p.stroke(p.red(lineCol), p.green(lineCol), p.blue(lineCol), 70 * filamentProgress);
        p.strokeWeight(1);
        for (const [a, b] of plan.filaments) {
          const A = centers[a];
          const B = centers[b];
          const midX = (A.cx + B.cx) / 2 + Math.sin(t * 0.1 + a) * 30;
          const midY = (A.cy + B.cy) / 2 + Math.cos(t * 0.1 + b) * 30;
          p.bezier(A.cx, A.cy, midX, midY, midX, midY, B.cx, B.cy);
        }
        p.noStroke();
      }

      plan.clusters.forEach((cluster, i) => {
        const progress = clusterProgress(i, globalT);
        if (progress <= 0) return;
        const rt = runtime[i];
        const cx = cluster.x * width + rt.offsetX + rt.pushX;
        const cy = cluster.y * height + rt.offsetY + rt.pushY;
        const radius = Math.min(width, height) * cluster.radius;
        const col = clusterColor(i);

        drawFractalBranches(cx, cy, radius, cluster.tendrils, cluster.seed, t, progress, col);
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
