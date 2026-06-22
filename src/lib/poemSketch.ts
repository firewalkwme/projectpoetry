import type p5 from "p5";

export type SceneWord = {
  text: string;
  fontScale: number;
};

type WordParticle = {
  text: string;
  fontSize: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dragging: boolean;
};

type RainDrop = {
  x: number;
  y: number;
  len: number;
  speed: number;
};

const INWARD_K = 0.55;
const TANGENT_K = 3200;
const MIN_RADIUS = 70;
const TRAIL_FADE = 14; // background alpha per frame: lower = longer streaks
const DRAG_HIT_RADIUS = 44;
const RECYCLE_CHANCE_PER_SEC = 0.12;
const PULSE_RADIUS = 260;
const PULSE_STRENGTH = 2600;

export type PoemSketchOptions = {
  words: SceneWord[];
  color: string;
  onRain?: () => void;
};

export function createPoemSketch(opts: PoemSketchOptions) {
  return (p: p5) => {
    let width = p.windowWidth;
    let height = p.windowHeight;
    let cx = width / 2;
    let cy = height / 2;

    let particles: WordParticle[] = [];
    let pulses: { x: number; y: number; life: number }[] = [];
    let rain: RainDrop[] = [];
    let rainActive = false;
    let rainTimer = 0;

    let dragIndex = -1;
    let lastFrameMs = 0;

    function spawnAtRing(text: string, fontSize: number): WordParticle {
      const angle = p.random(p.TWO_PI);
      const radius = Math.max(width, height) * p.random(0.45, 0.75);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const inward = p.random(20, 60);
      return {
        text,
        fontSize,
        x,
        y,
        vx: ((cx - x) / radius) * inward,
        vy: ((cy - y) / radius) * inward,
        dragging: false,
      };
    }

    function startRain() {
      rainActive = true;
      rain = Array.from({ length: 180 }, () => ({
        x: p.random(-width * 0.2, width),
        y: p.random(-height, 0),
        len: p.random(20, 50),
        speed: p.random(600, 1000),
      }));
      opts.onRain?.();
    }

    p.setup = () => {
      const canvas = p.createCanvas(width, height);
      canvas.style("position", "fixed");
      canvas.style("inset", "0");
      canvas.style("z-index", "-1");
      p.textFont("Georgia, serif");
      p.textAlign(p.CENTER, p.CENTER);
      p.background(4, 4, 6);

      particles = opts.words.map((w) => spawnAtRing(w.text, 15 * w.fontScale));

      lastFrameMs = p.millis();
    };

    p.windowResized = () => {
      width = p.windowWidth;
      height = p.windowHeight;
      cx = width / 2;
      cy = height / 2;
      p.resizeCanvas(width, height);
      p.background(4, 4, 6);
    };

    p.mousePressed = () => {
      let nearestIdx = -1;
      let nearestDist = DRAG_HIT_RADIUS;
      particles.forEach((b, i) => {
        const d = p.dist(p.mouseX, p.mouseY, b.x, b.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      });

      if (nearestIdx >= 0) {
        dragIndex = nearestIdx;
        particles[nearestIdx].dragging = true;
      } else {
        // empty-space click: a shockwave pulse that disrupts the vortex
        // locally, scattering nearby words outward -- the "play with it"
        // interaction
        pulses.push({ x: p.mouseX, y: p.mouseY, life: 1 });
      }
    };

    p.mouseDragged = () => {
      if (dragIndex >= 0) {
        particles[dragIndex].x = p.mouseX;
        particles[dragIndex].y = p.mouseY;
      }
    };

    p.mouseReleased = () => {
      if (dragIndex >= 0) {
        particles[dragIndex].dragging = false;
        particles[dragIndex].vx = 0;
        particles[dragIndex].vy = 0;
      }
      dragIndex = -1;
    };

    p.draw = () => {
      const now = p.millis();
      const dt = Math.min((now - lastFrameMs) / 1000, 0.05);
      lastFrameMs = now;

      // low-alpha repaint instead of a full clear: previous frames bleed
      // through faintly, which is what turns moving text into the smeared,
      // streaking trails of the reference piece rather than crisp ghosting
      p.noStroke();
      p.fill(4, 4, 6, TRAIL_FADE);
      p.rect(0, 0, width, height);

      // random rain, visual + (if audio is playing) audible
      rainTimer += dt;
      if (!rainActive && Math.random() < dt * 0.02) startRain();
      if (rainActive) {
        p.stroke(180, 200, 220, 70);
        p.strokeWeight(1);
        for (let i = rain.length - 1; i >= 0; i--) {
          const d = rain[i];
          d.y += d.speed * dt;
          d.x += d.speed * 0.18 * dt;
          p.line(d.x, d.y, d.x - d.len * 0.18, d.y - d.len);
          if (d.y > height + 50) {
            rain[i] = {
              x: p.random(-width * 0.2, width),
              y: p.random(-height * 0.3, 0),
              len: p.random(20, 50),
              speed: p.random(600, 1000),
            };
          }
        }
        rainTimer -= dt;
        if (rainTimer < -6) {
          rainActive = false;
          rainTimer = 0;
        }
      }
      p.noStroke();

      for (const pulse of pulses) pulse.life -= dt * 1.2;
      pulses = pulses.filter((pl) => pl.life > 0);

      const textColor = p.color(opts.color);

      for (let i = 0; i < particles.length; i++) {
        const b = particles[i];

        if (!b.dragging) {
          const dx = cx - b.x;
          const dy = cy - b.y;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const rx = dx / dist;
          const ry = dy / dist;
          const tx = -ry;
          const ty = rx;

          const inward = Math.max(dist - MIN_RADIUS, 0) * INWARD_K;
          const tangent = TANGENT_K / Math.max(dist, MIN_RADIUS);

          let ax = rx * inward + tx * tangent;
          let ay = ry * inward + ty * tangent;

          for (const pulse of pulses) {
            const pdx = b.x - pulse.x;
            const pdy = b.y - pulse.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist < PULSE_RADIUS && pdist > 1) {
              const force = (1 - pdist / PULSE_RADIUS) * PULSE_STRENGTH * pulse.life;
              ax += (pdx / pdist) * force;
              ay += (pdy / pdist) * force;
            }
          }

          b.vx += ax * dt;
          b.vy += ay * dt;
          b.vx *= 1 - Math.min(dt * 0.6, 0.3);
          b.vy *= 1 - Math.min(dt * 0.6, 0.3);

          const speed = Math.hypot(b.vx, b.vy);
          const maxSpeed = 900;
          if (speed > maxSpeed) {
            b.vx = (b.vx / speed) * maxSpeed;
            b.vy = (b.vy / speed) * maxSpeed;
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          const margin = 20;
          if (b.x < margin) {
            b.x = margin;
            b.vx = Math.abs(b.vx) * 0.8;
          } else if (b.x > width - margin) {
            b.x = width - margin;
            b.vx = -Math.abs(b.vx) * 0.8;
          }
          if (b.y < margin) {
            b.y = margin;
            b.vy = Math.abs(b.vy) * 0.8;
          } else if (b.y > height - margin) {
            b.y = height - margin;
            b.vy = -Math.abs(b.vy) * 0.8;
          }
        }

        // every so often a word re-enters from the outer ring, so the
        // vortex never fully settles -- the "ecosystem" keeps cycling
        if (!b.dragging && Math.random() < dt * RECYCLE_CHANCE_PER_SEC) {
          particles[i] = spawnAtRing(b.text, b.fontSize);
          continue;
        }

        const speed = Math.hypot(b.vx, b.vy);
        const angle = speed > 5 ? Math.atan2(b.vy, b.vx) : 0;

        p.push();
        p.translate(b.x, b.y);
        p.rotate(angle * 0.4);
        p.fill(p.red(textColor), p.green(textColor), p.blue(textColor), 230);
        p.textSize(b.fontSize);
        p.text(b.text, 0, 0);
        p.pop();
      }
    };
  };
}
