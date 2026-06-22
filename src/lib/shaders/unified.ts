export const unifiedFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uWeightFlow;
  uniform float uWeightCell;
  uniform float uWeightVein;
  uniform float uWeightGlow;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uTurbulence;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 17.7))) * 7321.5);
  }

  float noise(vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = step(a.yx, a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(
      dot(a, hash2(i + 0.0)),
      dot(b, hash2(i + o)),
      dot(c, hash2(i + 1.0))
    );
    return dot(n, vec3(70.0));
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      total += noise(p) * amp;
      p *= 2.02;
      amp *= 0.5;
    }
    return total;
  }

  float ridgedFbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(noise(p));
      total += n * n * amp;
      p *= 2.1;
      amp *= 0.55;
    }
    return total;
  }

  vec2 rotate(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c) * p;
  }

  // domain-warped flow field (fire/motion/loss territory)
  float flowPattern(vec2 uv, float t) {
    float curlAngle = (noise(uv * 1.1 + t * 0.3) - 0.5) * 1.8 * uTurbulence;
    vec2 w = rotate(uv, curlAngle * 0.4);
    vec2 q = vec2(fbm(w * 1.6 + t), fbm(w * 1.6 + 5.2 - t * 0.8)) * uTurbulence;
    vec2 r = vec2(
      fbm(w * 1.6 + 3.2 * q + 1.7 + t * 0.6),
      fbm(w * 1.6 + 3.2 * q + 8.3 - t * 0.4)
    ) * uTurbulence;
    return 0.5 + 0.5 * sin(fbm(w * 1.6 + 3.6 * r) * 2.4 + length(r) * 1.8 + t * 0.5);
  }

  // rippled cellular lattice (fragmentation/urban/nature territory)
  float cellPattern(vec2 uv, float t) {
    vec2 warp = vec2(
      noise(uv * 1.4 + t * 0.5) * 0.5,
      noise(uv * 1.4 + 7.0 - t * 0.4) * 0.5
    );
    vec2 p = (uv + warp * uTurbulence * 0.6) * 3.6;
    vec2 cell = floor(p);
    vec2 local = fract(p);
    float minDist = 8.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 base = 0.5 + 0.5 * hash2(cell + offset);
        float orbitAngle = t * (0.2 + base.x * 0.3) + base.y * 6.2831;
        float orbitRadius = (0.22 + 0.1 * hash1(cell + offset + 3.7)) * uTurbulence;
        vec2 point = base + vec2(cos(orbitAngle), sin(orbitAngle)) * orbitRadius;
        float dist = length(local - offset - point);
        minDist = min(minDist, dist);
      }
    }
    return 1.0 - smoothstep(0.0, 0.3, minDist);
  }

  // ridged/turbulent veins advected by a shear flow (earth/stillness/dark)
  float veinPattern(vec2 uv, float t) {
    vec2 flow = vec2(noise(uv * 0.8 + t), noise(uv * 0.8 - t * 0.7 + 4.0)) * uTurbulence;
    vec2 sheared = uv + vec2(uv.y, -uv.x) * 0.15 * sin(t * 2.0) + flow * 0.5;
    float v = ridgedFbm(sheared * 2.6 + flow * 1.5);
    return sin(v * 6.0 + sheared.x * 2.0) * 0.5 + 0.5;
  }

  // folded-coordinate light interference (water/light/love)
  float glowPattern(vec2 uv, float t) {
    vec2 i = uv;
    float c = 0.0;
    float intensity = 0.009;
    for (int n = 0; n < 5; n++) {
      float fn = float(n) + 1.0;
      float tt = t * (1.0 - 3.0 / fn) * 0.7;
      i = uv + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      vec2 denom = vec2(sin(i.x + tt) / intensity, cos(i.y + tt) / intensity);
      c += 1.0 / length(denom + 0.0001);
    }
    return clamp(c / 5.0 * 0.6, 0.0, 1.4);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y) * uScale;
    float t = uTime * 0.18 * uSpeed;

    float flow = flowPattern(uv, t);
    float cell = cellPattern(uv, t);
    float vein = veinPattern(uv, t);
    float glow = glowPattern(uv * 1.3, t);

    vec3 flowColor = mix(vec3(0.02), uColorA, flow);
    vec3 cellColor = mix(vec3(0.02), uColorB, cell);
    vec3 veinColor = mix(vec3(0.02), uColorC, vein);

    float wSum = max(uWeightFlow + uWeightCell + uWeightVein, 0.0001);
    vec3 color =
      (flowColor * uWeightFlow + cellColor * uWeightCell + veinColor * uWeightVein) / wSum;

    vec3 glowTint = (uColorA + uColorB + uColorC) / 3.0;
    color += glowTint * glow * uWeightGlow * 0.7;

    gl_FragColor = vec4(color, 1.0);
  }
`;
