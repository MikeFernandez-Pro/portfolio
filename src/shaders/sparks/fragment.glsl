uniform vec3 uColor;
uniform float uTime;

varying float vPosY;

void main() {
                // Circle Shape
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = step(0.5, strength);
    strength = 1.0 - strength;

    vec3 gradientColor = uColor / (max(0.1, vPosY) * 255.0);

    vec3 color = mix(vec3(0.0), gradientColor, strength);
    gl_FragColor = vec4(color, 1.0) * min((10.0), max(0.1, 1.0 / (vPosY)));
}