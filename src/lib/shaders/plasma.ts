export const plasmaFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;

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

  // ridged variant: folds noise around zero so valleys turn into sharp
  // crests, giving a different texture quality than smooth fbm
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

  void main() {
    vec2 raw = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float t = uTime * 0.1;

    // curl-like pre-pass: rotate the coordinate locally by an angle drawn
    // from noise, so the whole field swirls rather than just drifting
    float curlAngle = (noise(raw * 1.1 + t * 0.3) - 0.5) * 1.8;
    vec2 uv = rotate(raw, curlAngle * 0.4);

    // domain warping: distort the sampling coordinate through layers of
    // fbm before reading the final pattern, so nothing traces a clean curve
    vec2 q = vec2(
      fbm(uv * 1.6 + vec2(0.0, 0.0) + t),
      fbm(uv * 1.6 + vec2(5.2, 1.3) - t * 0.8)
    );
    vec2 r = vec2(
      fbm(uv * 1.6 + 3.2 * q + vec2(1.7, 9.2) + t * 0.6),
      fbm(uv * 1.6 + 3.2 * q + vec2(8.3, 2.8) - t * 0.4)
    );
    float n = fbm(uv * 1.6 + 3.6 * r);
    float ridge = ridgedFbm(uv * 2.4 + 2.0 * r - t * 0.5);

    float blend = 0.5 + 0.5 * sin(n * 2.4 + length(r) * 1.8 + uTime * 0.2);

    vec3 base = mix(vec3(0.02, 0.02, 0.05), uTint, 0.65);
    vec3 color = mix(base * 0.3, uTint, blend);
    color = mix(color, uTint * 1.2, smoothstep(0.7, 1.0, length(q)) * 0.3);
    color += uTint * ridge * 0.22;

    gl_FragColor = vec4(color, 1.0);
  }
`;
