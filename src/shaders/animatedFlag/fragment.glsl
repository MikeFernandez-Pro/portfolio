uniform sampler2D uMap;

varying vec2 vUv;
varying vec3 vPosition;

void main() { 

      vec3 multiplier = vec3(0.3, 0.4, 0.7); // Adjust the values as needed
  csm_FragColor.rgb *= multiplier;
}