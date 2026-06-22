export const voronoiFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 17.7))) * 7321.5);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 raw = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    // ripple the sampling plane itself so the cell lattice never sits
    // on a perfectly straight grid
    vec2 warp = vec2(
      valueNoise(raw * 1.4 + uTime * 0.05),
      valueNoise(raw * 1.4 + 7.0 - uTime * 0.04)
    );
    vec2 uv = (raw + (warp - 0.5) * 0.6) * 3.6;

    vec2 cell = floor(uv);
    vec2 local = fract(uv);

    float minDist = 8.0;
    float glow = 0.0;
    vec2 closestOffset = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 base = hash2(cell + offset);
        vec2 wobble = vec2(
          sin(uTime * 0.35 + base.x * 6.2831),
          cos(uTime * 0.3 + base.y * 6.2831)
        ) * 0.28;
        vec2 point = base + wobble;
        float dist = length(local - offset - point);
        glow += 0.025 / (dist * dist + 0.02);
        if (dist < minDist) {
          minDist = dist;
          closestOffset = offset;
        }
      }
    }

    float edge = smoothstep(0.0, 0.22, minDist);
    float cellShade = hash1(cell + closestOffset);

    vec3 base = mix(vec3(0.03, 0.03, 0.06), uTint * 0.5, cellShade);
    vec3 color = mix(uTint * 0.85, base, edge);
    color += uTint * min(glow, 1.2) * 0.18;

    gl_FragColor = vec4(color, 1.0);
  }
`;
