import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  fragmentShader: string;
  floats?: Record<string, number>;
  colors?: Record<string, string>;
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
  floats = {},
  colors = {},
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ floats, colors });
  liveRef.current = { floats, colors };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms: Record<string, { value: number | THREE.Vector2 | THREE.Vector3 }> = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    };
    for (const key of Object.keys(liveRef.current.floats)) {
      uniforms[key] = { value: liveRef.current.floats[key] };
    }
    for (const key of Object.keys(liveRef.current.colors)) {
      uniforms[key] = { value: hexToVec3(liveRef.current.colors[key]) };
    }

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
      (uniforms.uResolution.value as THREE.Vector2).set(w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf: number;
    const start = performance.now();
    function frame() {
      uniforms.uTime.value = (performance.now() - start) / 1000;
      for (const key of Object.keys(liveRef.current.floats)) {
        if (uniforms[key]) uniforms[key].value = liveRef.current.floats[key];
      }
      for (const key of Object.keys(liveRef.current.colors)) {
        if (uniforms[key]) {
          uniforms[key].value = hexToVec3(liveRef.current.colors[key]);
        }
      }
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
