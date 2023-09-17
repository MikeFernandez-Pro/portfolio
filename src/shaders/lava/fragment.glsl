uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;
uniform float uIntensity;

varying float vElevation;

void main() {
  float  mixStrengh = (vElevation + uColorOffset) * uColorMultiplier;
  vec3 color = mix(uDepthColor, uSurfaceColor, mixStrengh) * uIntensity;
  gl_FragColor = vec4(color, 1.0);
} 