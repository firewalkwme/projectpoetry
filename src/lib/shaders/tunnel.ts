export const tunnelFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;

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
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    // perturb both radius and angle with slow-rolling noise so the tunnel
    // wobbles like it's breathing rather than tracing perfect circles
    float wobble = valueNoise(vec2(angle * 2.0, uTime * 0.25)) - 0.5;
    float radiusN = radius + wobble * 0.12;
    float angleN = angle + (valueNoise(vec2(radius * 3.0, uTime * 0.15)) - 0.5) * 0.6;

    float depth = 1.0 / max(radiusN, 0.04) + uTime * 1.4;
    float rings = sin(depth * 3.0 + wobble * 2.0) * 0.5 + 0.5;
    float spokes = sin(angleN * 9.0 + uTime * 0.6) * 0.5 + 0.5;

    float glow = rings * 0.7 + spokes * 0.3;
    glow *= smoothstep(1.3, 0.0, radiusN);

    vec3 base = mix(vec3(0.0), uTint, glow);
    vec3 color = base + 0.04 * vec3(spokes) + 0.03 * wobble;

    gl_FragColor = vec4(color, 1.0);
  }
`;
