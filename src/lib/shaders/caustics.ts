export const causticsFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uTurbulence;

  // classic light-caustic look: repeatedly fold the coordinate through a
  // rotation + sine pass and accumulate brightness near the folds. each
  // pass is a different kind of distortion than plasma/voronoi use.
  float caustic(vec2 p, float time) {
    vec2 i = p;
    float c = 0.0;
    float intensity = 0.0085;
    for (int n = 0; n < 6; n++) {
      float fn = float(n) + 1.0;
      float t = time * (1.0 - 3.2 / fn);
      i = p + vec2(
        cos(t - i.x) + sin(t + i.y),
        sin(t - i.y) + cos(t + i.x)
      );
      vec2 denom = vec2(
        sin(i.x + t) / intensity,
        cos(i.y + t) / intensity
      );
      c += 1.0 / length(denom + 0.0001);
    }
    return c / 6.0;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y) * uScale;
    float t = uTime * 0.35 * uSpeed;

    float c1 = caustic(uv * 1.4, t);
    float c2 = caustic(uv * 1.4 + 1.7 * uTurbulence, t * 1.3 + 2.0);
    float light = clamp(c1 * 0.6 + c2 * 0.5, 0.0, 1.6);

    vec3 deep = mix(vec3(0.0, 0.02, 0.05), uTint * 0.25, 0.5);
    vec3 color = deep + uTint * light * 0.6;
    color = pow(color, vec3(0.85));

    gl_FragColor = vec4(color, 1.0);
  }
`;
