export const marbleFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uTurbulence;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
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
      dot(a, hash(i + 0.0)),
      dot(b, hash(i + o)),
      dot(c, hash(i + 1.0))
    );
    return dot(n, vec3(70.0));
  }

  // ridged/turbulent fbm: veins instead of smooth blobs
  float veins(vec2 p) {
    float total = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 5; i++) {
      total += (1.0 - abs(noise(p))) * amp;
      p *= 2.0;
      amp *= 0.58;
    }
    return total;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y) * uScale;
    float t = uTime * 0.08 * uSpeed;

    // shear/advect the coordinate along a flowing direction before
    // computing veins, so the marbling streaks rather than sits static
    vec2 flow = vec2(
      noise(uv * 0.8 + t),
      noise(uv * 0.8 - t * 0.7 + 4.0)
    ) * uTurbulence;
    vec2 sheared = uv + vec2(uv.y, -uv.x) * 0.15 * sin(t * 2.0) + flow * 0.5;

    float vein = veins(sheared * 2.6 + flow * 1.5);
    float marbling = sin(vein * 6.0 + sheared.x * 2.0) * 0.5 + 0.5;

    vec3 stone = mix(vec3(0.04, 0.04, 0.06), vec3(0.85, 0.83, 0.8), 0.15);
    vec3 color = mix(stone, uTint, marbling);
    color = mix(color, uTint * 1.3, smoothstep(0.75, 1.0, vein) * 0.4);

    gl_FragColor = vec4(color, 1.0);
  }
`;
