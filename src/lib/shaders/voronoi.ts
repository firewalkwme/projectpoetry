export const voronoiFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTint;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    uv *= 4.0;

    vec2 cell = floor(uv);
    vec2 local = fract(uv);

    float minDist = 8.0;
    vec2 closestOffset = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 point = hash2(cell + offset);
        point += 0.5 + 0.5 * sin(uTime * 0.4 + 6.2831 * point);
        float dist = length(local - offset - point);
        if (dist < minDist) {
          minDist = dist;
          closestOffset = offset;
        }
      }
    }

    float edge = smoothstep(0.0, 0.06, minDist);
    float cellShade = fract(sin(dot(cell + closestOffset, vec2(41.3, 17.7))) * 7321.5);

    vec3 base = mix(vec3(0.03, 0.03, 0.06), uTint * 0.5, cellShade);
    vec3 color = mix(uTint * 0.9, base, edge);

    gl_FragColor = vec4(color, 1.0);
  }
`;
