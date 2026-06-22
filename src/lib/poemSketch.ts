import type p5 from "p5";
import { getMoodPhysics } from "./wordMotion";
import type { Mood } from "./moods";
import type { ElementalSpec } from "./elemental";
import { ELEMENTAL_KIND_CONFIG } from "./elemental";
import { hashString } from "./hash";

export type SceneWord = {
  text: string;
  fontScale: number;
};

type WordBoid = {
  text: string;
  fontSize: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  halfW: number;
  halfH: number;
  trail: { x: number; y: number }[];
  paused: boolean;
  dragging: boolean;
  flee: { active: boolean; dirX: number; dirY: number; timeLeft: number };
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

type Burst = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: number;
};

type Ripple = {
  x: number;
  y: number;
  life: number;
};

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  phase: number;
};

const NEIGHBOR_RADIUS = 170;
const ALIGNMENT_STRENGTH = 1.1;
const COHESION_STRENGTH = 0.35;
const REPEL_STRENGTH = 1400;
const MAX_PUSH = 70;
const FLEE_DURATION = 0.6;
const FLEE_BURST = 320;
const FLEE_ACCEL = 900;
const DRAG_HIT_RADIUS = 40;

export type PoemSketchOptions = {
  words: SceneWord[];
  mood: Mood;
  color: string;
  elemental: ElementalSpec;
};

export function createPoemSketch(opts: PoemSketchOptions) {
  return (p: p5) => {
    let width = p.windowWidth;
    let height = p.windowHeight;
    const physics = getMoodPhysics(opts.mood);
    const config = ELEMENTAL_KIND_CONFIG[opts.elemental.kind];

    let colors: p5.Color[] = [];
    let blobs: { x: number; y: number; r: number; col: p5.Color; phase: number; speed: number }[] = [];
    let boids: WordBoid[] = [];
    let particles: Particle[] = [];
    let bursts: Burst[] = [];
    let ripples: Ripple[] = [];
    let stars: Star[] = [];

    let dragIndex = -1;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let pressX = 0;
    let pressY = 0;
    let moved = false;
    let boost = 0;
    let lastFrameMs = 0;

    function vividColor(hex: string): p5.Color {
      const base = p.color(hex);
      p.colorMode(p.HSB, 360, 100, 100, 255);
      const h = p.hue(base);
      const vivid = p.color(h, Math.min(p.saturation(base) * 1.4 + 25, 100), Math.min(p.brightness(base) * 1.3 + 20, 100));
      p.colorMode(p.RGB, 255);
      return vivid;
    }

    function spawnParticle(): Particle {
      return {
        x: p.random(width),
        y: p.random(height),
        vx: p.random(-1, 1) * config.jitter,
        vy: p.random(-1, 1) * config.jitter,
        life: p.random(100),
        maxLife: p.random(200, 400),
        size: p.random(config.sizeMin, config.sizeMax),
        rotation: p.random(p.TWO_PI),
      };
    }

    p.setup = () => {
      const canvas = p.createCanvas(width, height);
      canvas.style("position", "fixed");
      canvas.style("inset", "0");
      canvas.style("z-index", "-1");
      p.textFont("Georgia, serif");
      p.noStroke();

      colors = opts.elemental.palette.map(vividColor);
      blobs = Array.from({ length: 5 }, () => ({
        x: p.random(width),
        y: p.random(height),
        r: height * p.random(0.35, 0.75),
        col: colors[Math.floor(p.random(colors.length))],
        phase: p.random(p.TWO_PI),
        speed: p.random(0.02, 0.05),
      }));

      stars = Array.from({ length: 200 }, () => ({
        x: p.random(width),
        y: p.random(height),
        z: p.random(0.3, 1),
        r: p.random(0.6, 1.8),
        phase: p.random(p.TWO_PI),
      }));

      particles = Array.from(
        { length: Math.round(config.baseCount * opts.elemental.intensity) },
        spawnParticle
      );

      boids = opts.words.map((w) => {
        const hash = hashString(w.text + opts.mood);
        const spreadOffset = (((hash % 1000) / 1000) - 0.5) * physics.initialAngleSpread;
        const angle = physics.initialAngleCenter + spreadOffset;
        const fontSize = 16 * w.fontScale;
        p.textSize(fontSize);
        const tw = p.textWidth(w.text);
        return {
          text: w.text,
          fontSize,
          x: p.random(width),
          y: p.random(height),
          vx: Math.cos(angle) * physics.speed,
          vy: Math.sin(angle) * physics.speed,
          halfW: tw / 2 + 6,
          halfH: fontSize / 2 + 4,
          trail: [],
          paused: false,
          dragging: false,
          flee: { active: false, dirX: 0, dirY: 0, timeLeft: 0 },
        };
      });

      lastFrameMs = p.millis();
    };

    p.windowResized = () => {
      width = p.windowWidth;
      height = p.windowHeight;
      p.resizeCanvas(width, height);
    };

    p.mouseMoved = () => {
      for (const b of boids) {
        const d = p.dist(p.mouseX, p.mouseY, b.x, b.y);
        b.paused = d < Math.max(b.halfW, b.halfH) + 6 && dragIndex === -1;
      }
    };

    p.mousePressed = () => {
      pressX = p.mouseX;
      pressY = p.mouseY;
      moved = false;

      let nearestIdx = -1;
      let nearestDist = DRAG_HIT_RADIUS;
      boids.forEach((b, i) => {
        const d = p.dist(p.mouseX, p.mouseY, b.x, b.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      });

      if (nearestIdx >= 0) {
        dragIndex = nearestIdx;
        dragOffsetX = p.mouseX - boids[nearestIdx].x;
        dragOffsetY = p.mouseY - boids[nearestIdx].y;
      }
    };

    p.mouseDragged = () => {
      if (p.dist(p.mouseX, p.mouseY, pressX, pressY) > 4) moved = true;
      if (dragIndex >= 0 && moved) {
        const b = boids[dragIndex];
        b.dragging = true;
        b.x = p.mouseX - dragOffsetX;
        b.y = p.mouseY - dragOffsetY;
      }
    };

    p.mouseReleased = () => {
      if (dragIndex >= 0) {
        const b = boids[dragIndex];
        if (!moved) {
          let dx = b.x - p.mouseX;
          let dy = b.y - p.mouseY;
          const len = Math.hypot(dx, dy);
          if (len < 0.01) {
            const a = p.random(p.TWO_PI);
            dx = Math.cos(a);
            dy = Math.sin(a);
          } else {
            dx /= len;
            dy /= len;
          }
          b.flee = { active: true, dirX: dx, dirY: dy, timeLeft: FLEE_DURATION };
          b.vx += dx * FLEE_BURST;
          b.vy += dy * FLEE_BURST;
        }
        b.dragging = false;
      } else if (!moved) {
        // empty-space click: intensify the elemental layer (like clicking
        // on rain to make it pour harder) and fire a visible shockwave so
        // the interaction is unmistakable, not just a subtle density bump
        boost = Math.min(boost + 1, 3);
        const target = Math.round(config.baseCount * opts.elemental.intensity * (1 + boost * 0.6));
        while (particles.length < target) particles.push(spawnParticle());

        ripples.push({ x: p.mouseX, y: p.mouseY, life: 1 });
        const burstCount = 36;
        for (let i = 0; i < burstCount; i++) {
          const a = (i / burstCount) * p.TWO_PI + p.random(-0.1, 0.1);
          const speed = p.random(120, 320);
          bursts.push({
            x: p.mouseX,
            y: p.mouseY,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 1,
            size: p.random(2, 5),
            color: Math.floor(p.random(colors.length)),
          });
        }
      }
      dragIndex = -1;
    };

    p.draw = () => {
      const now = p.millis();
      const dt = Math.min((now - lastFrameMs) / 1000, 0.05);
      lastFrameMs = now;
      const t = now / 1000;

      boost = Math.max(0, boost - dt * 0.25);
      const speedMul = opts.elemental.speed * (1 + boost * 0.8);

      // deep space backdrop, darkest at the edges
      const sky = p.drawingContext as CanvasRenderingContext2D;
      const grad = sky.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, "#0c0a18");
      grad.addColorStop(1, "#020103");
      sky.fillStyle = grad;
      sky.fillRect(0, 0, width, height);

      p.blendMode(p.ADD);
      p.noStroke();
      for (const star of stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.2 * star.z + star.phase));
        p.fill(255, 255, 250, twinkle * 200 * star.z);
        p.circle(star.x, star.y, star.r * (1 + star.z));
      }

      // nebula clouds -- additive blending lets overlapping colors glow
      // into each other instead of just stacking flat translucent fills
      for (const b of blobs) {
        const bx = b.x + Math.sin(t * b.speed + b.phase) * 80;
        const by = b.y + Math.cos(t * b.speed * 0.8 + b.phase) * 55;
        for (let r = b.r; r > 0; r -= b.r / 10) {
          const alpha = 9 * (1 - r / b.r);
          p.fill(p.red(b.col), p.green(b.col), p.blue(b.col), alpha);
          p.circle(bx, by, r * 2);
        }
      }
      p.blendMode(p.BLEND);

      // elemental particles -- deflected slightly by nearby words so the
      // two systems visibly interact instead of sitting in separate layers.
      // additive blending gives every particle a soft bloom regardless of
      // kind, which is what makes this read as otherworldly light rather
      // than flat painted shapes
      p.blendMode(p.ADD);
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const lifeRatio = particle.life / particle.maxLife;
        const fade = Math.min(lifeRatio * 4, 1, (1 - lifeRatio) * 4);
        const color = colors[i % colors.length];

        let pushX = 0;
        let pushY = 0;
        for (const b of boids) {
          const dx = particle.x - b.x;
          const dy = particle.y - b.y;
          const dist = Math.hypot(dx, dy);
          const influence = Math.max(b.halfW, b.halfH) + 40;
          if (dist < influence && dist > 0.01) {
            const force = (1 - dist / influence) * 30;
            pushX += (dx / dist) * force;
            pushY += (dy / dist) * force;
          }
        }

        particle.x += (particle.vx + config.gravityX * 0.04 + pushX) * speedMul;
        particle.y += (particle.vy + config.gravityY * 0.04 + pushY) * speedMul;
        particle.rotation += 0.01 * speedMul;
        particle.life += speedMul;

        // every kind gets a soft bloom halo first, then its own shape
        // drawn brighter on top
        for (let r = particle.size * 3.5; r > 0; r -= particle.size * 0.7) {
          const a = 0.45 * fade * 255 * (1 - r / (particle.size * 3.5));
          p.fill(p.red(color), p.green(color), p.blue(color), a);
          p.circle(particle.x, particle.y, r * 2);
        }

        if (config.shape === "line") {
          p.stroke(p.red(color), p.green(color), p.blue(color), 200 * fade);
          p.strokeWeight(2);
          p.line(particle.x, particle.y, particle.x - config.gravityX * 0.03, particle.y - particle.size);
          p.noStroke();
        } else if (config.shape === "leaf") {
          p.push();
          p.translate(particle.x, particle.y);
          p.rotate(particle.rotation);
          p.fill(p.red(color), p.green(color), p.blue(color), 200 * fade);
          p.ellipse(0, 0, particle.size * 2, particle.size * 0.9);
          p.pop();
        } else if (config.shape === "blob") {
          // already fully expressed by the bloom halo above
        } else {
          p.fill(p.red(color), p.green(color), p.blue(color), 0.95 * fade * 255);
          p.circle(particle.x, particle.y, particle.size * 1.4);
        }

        if (
          particle.life > particle.maxLife ||
          particle.x < -40 ||
          particle.x > width + 40 ||
          particle.y < -40 ||
          particle.y > height + 40
        ) {
          particles[i] = spawnParticle();
        }
      }
      p.blendMode(p.BLEND);
      const baseline = Math.round(config.baseCount * opts.elemental.intensity);
      if (particles.length > baseline && boost <= 0.01) particles.length = baseline;

      // click shockwave: a burst of bright sparks flying outward plus an
      // expanding ring, so a click has an unmistakable visible effect
      p.blendMode(p.ADD);
      for (let i = bursts.length - 1; i >= 0; i--) {
        const burst = bursts[i];
        burst.life -= dt * 1.4;
        if (burst.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        burst.x += burst.vx * dt;
        burst.y += burst.vy * dt;
        burst.vx *= 1 - dt * 1.5;
        burst.vy *= 1 - dt * 1.5;
        const color = colors[burst.color];
        p.fill(p.red(color), p.green(color), p.blue(color), burst.life * 255);
        p.circle(burst.x, burst.y, burst.size * (0.5 + burst.life));
      }
      p.blendMode(p.BLEND);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.life -= dt * 1.1;
        if (ripple.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        p.noFill();
        p.stroke(255, 255, 245, ripple.life * 160);
        p.strokeWeight(2);
        p.circle(ripple.x, ripple.y, (1 - ripple.life) * 360);
        p.noStroke();
      }

      // word flocking: per-boid mood physics, then a shared neighbor pass
      // for separation + alignment + cohesion (the actual "school" behavior)
      for (const b of boids) {
        if (b.dragging) continue;

        if (b.flee.active) {
          b.vx += b.flee.dirX * FLEE_ACCEL * dt;
          b.vy += b.flee.dirY * FLEE_ACCEL * dt;
          b.flee.timeLeft -= dt;
          if (b.flee.timeLeft <= 0) b.flee.active = false;
        } else if (!b.paused) {
          const turbAngle = (Math.random() - 0.5) * physics.turbulence * dt;
          const cos = Math.cos(turbAngle);
          const sin = Math.sin(turbAngle);
          const nvx = b.vx * cos - b.vy * sin;
          const nvy = b.vx * sin + b.vy * cos;
          b.vx = nvx;
          b.vy = nvy + physics.biasY * dt;
          if (Math.random() < physics.dartChance) {
            const a = Math.random() * Math.PI * 2;
            b.vx += Math.cos(a) * physics.dartStrength * dt;
            b.vy += Math.sin(a) * physics.dartStrength * dt;
          }
        }

        if (!b.flee.active) {
          b.vx *= 1 - Math.min(dt * 1.4, 0.3);
          b.vy *= 1 - Math.min(dt * 1.4, 0.3);
        }
      }

      const alignVX = new Float64Array(boids.length);
      const alignVY = new Float64Array(boids.length);
      const cohX = new Float64Array(boids.length);
      const cohY = new Float64Array(boids.length);
      const neighborCount = new Int32Array(boids.length);

      for (let i = 0; i < boids.length; i++) {
        for (let j = i + 1; j < boids.length; j++) {
          const a = boids[i];
          const b = boids[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);

          if (dist < NEIGHBOR_RADIUS) {
            alignVX[i] += b.vx;
            alignVY[i] += b.vy;
            cohX[i] += b.x;
            cohY[i] += b.y;
            neighborCount[i]++;
            alignVX[j] += a.vx;
            alignVY[j] += a.vy;
            cohX[j] += a.x;
            cohY[j] += a.y;
            neighborCount[j]++;
          }

          const overlapX = a.halfW + b.halfW - Math.abs(dx);
          const overlapY = a.halfH + b.halfH - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            const pX = (overlapX / (a.halfW + b.halfW)) * Math.sign(dx || Math.random() - 0.5);
            const pY = (overlapY / (a.halfH + b.halfH)) * Math.sign(dy || Math.random() - 0.5);
            const fx = Math.max(-MAX_PUSH, Math.min(MAX_PUSH, pX * REPEL_STRENGTH * dt));
            const fy = Math.max(-MAX_PUSH, Math.min(MAX_PUSH, pY * REPEL_STRENGTH * dt));
            if (!a.dragging) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (!b.dragging) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }
      }

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        if (b.dragging || b.flee.active || neighborCount[i] === 0) continue;
        const n = neighborCount[i];
        b.vx += (alignVX[i] / n - b.vx) * ALIGNMENT_STRENGTH * dt;
        b.vy += (alignVY[i] / n - b.vy) * ALIGNMENT_STRENGTH * dt;
        b.vx += (cohX[i] / n - b.x) * COHESION_STRENGTH * dt;
        b.vy += (cohY[i] / n - b.y) * COHESION_STRENGTH * dt;
      }

      for (const b of boids) {
        if (b.dragging) continue;
        const speed = Math.hypot(b.vx, b.vy);
        const maxSpeed = physics.speed * (b.flee.active ? 5 : 2.2);
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        }

        let nx = b.x + b.vx * dt;
        let ny = b.y + b.vy * dt;
        if (physics.edgeMode === "bounce" || b.flee.active) {
          if (nx < 0) {
            nx = 0;
            b.vx = Math.abs(b.vx);
          } else if (nx > width) {
            nx = width;
            b.vx = -Math.abs(b.vx);
          }
          if (ny < 0) {
            ny = 0;
            b.vy = Math.abs(b.vy);
          } else if (ny > height) {
            ny = height;
            b.vy = -Math.abs(b.vy);
          }
        } else {
          if (nx < 0) nx = width;
          else if (nx > width) nx = 0;
          if (ny < -20) ny = height + 20;
          else if (ny > height + 20) ny = -20;
        }
        b.x = nx;
        b.y = ny;
      }

      // fading trail + the word itself, drawn last so words sit on top
      const textColor = p.color(opts.color);
      p.textAlign(p.CENTER, p.CENTER);
      for (const b of boids) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();

        for (let k = 0; k < b.trail.length; k++) {
          const pt = b.trail[k];
          const a = (k / b.trail.length) * 40;
          p.fill(p.red(textColor), p.green(textColor), p.blue(textColor), a);
          p.textSize(b.fontSize);
          p.text(b.text, pt.x, pt.y);
        }

        p.fill(p.red(textColor), p.green(textColor), p.blue(textColor), 235);
        p.textSize(b.fontSize);
        p.text(b.text, b.x, b.y);
      }
    };
  };
}
