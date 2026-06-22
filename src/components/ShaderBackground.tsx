import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  fragmentShader: string;
  tint?: string;
  speed?: number;
  scale?: number;
  turbulence?: number;
};

const VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

export function ShaderBackground({
  fragmentShader,
  tint = "#ffffff",
  speed = 1,
  scale = 1,
  turbulence = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ tint, speed, scale, turbulence });
  liveRef.current = { tint, speed, scale, turbulence };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTint: { value: hexToVec3(liveRef.current.tint) },
      uSpeed: { value: liveRef.current.speed },
      uScale: { value: liveRef.current.scale },
      uTurbulence: { value: liveRef.current.turbulence },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      uniforms,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf: number;
    const start = performance.now();
    function frame() {
      uniforms.uTime.value = (performance.now() - start) / 1000;
      uniforms.uTint.value = hexToVec3(liveRef.current.tint);
      uniforms.uSpeed.value = liveRef.current.speed;
      uniforms.uScale.value = liveRef.current.scale;
      uniforms.uTurbulence.value = liveRef.current.turbulence;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      material.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [fragmentShader]);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}
    />
  );
}
