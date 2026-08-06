uniform vec3 uRedTipColor;
uniform float uRedTipLength; // portion of the blade covered by the red tip (0-1)

varying vec3 vColor;
varying vec2 vUv; // x: flower flag, y: height percent along the blade

void main() {
  vec3 color = vColor;

  // Flower blades fade to red towards the tip
  if (vUv.x > 0.5) {
    color = mix(color, uRedTipColor, smoothstep(1.0 - uRedTipLength, 1.0, vUv.y));
  }

  gl_FragColor = vec4(color, 1.0);
}
