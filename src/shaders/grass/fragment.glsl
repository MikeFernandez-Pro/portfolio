varying vec3 vColor;
varying vec4 vGrassData;

float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

void main() {
  float grassY = vGrassData.y;

  // Fake AO
  float ao = remap(pow(grassY, 2.0), 0.0, 1.0, 0.125, 1.0);

  vec3 color = vColor.xyz;
  color *= ao + 0.5;  

  // gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
  gl_FragColor = vec4(color, 1.0);
}
