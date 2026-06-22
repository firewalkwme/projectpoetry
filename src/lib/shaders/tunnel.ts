export const tunnelFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    float depth = 1.0 / max(radius, 0.04) + uTime * 1.4;
    float rings = sin(depth * 3.0) * 0.5 + 0.5;
    float spokes = sin(angle * 10.0 + uTime * 0.6) * 0.5 + 0.5;

    float glow = rings * 0.7 + spokes * 0.3;
    glow *= smoothstep(1.3, 0.0, radius);

    vec3 base = mix(vec3(0.0), uTint, glow);
    vec3 color = base + 0.04 * vec3(spokes);

    gl_FragColor = vec4(color, 1.0);
  }
`;
