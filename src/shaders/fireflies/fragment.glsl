uniform vec3 uColor;
uniform float uIntensity;

varying float vScale;

void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));

    if(distanceToCenter > 0.475) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
        return;
    }
    
    // max() guards the center texel (1/0); clamp already saturates below 0.05
    float strengh = 0.05 / max(distanceToCenter, 0.001) - 0.1;
    strengh = clamp(strengh, 0.0, 1.0);
    gl_FragColor = vec4(uColor, strengh) * uIntensity * max(vScale, 0.0);
}