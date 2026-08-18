uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uEmissiveIntensity;

varying vec2 vUv;

void main() {

  float spiral = texture2D(uTexture, vUv).r;

  vec3 color = uColor * uEmissiveIntensity;

  gl_FragColor = vec4(color, max(0.0, spiral - 0.1));

 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
