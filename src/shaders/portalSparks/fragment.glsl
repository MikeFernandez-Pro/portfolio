uniform vec3 uColor;
uniform float uIntensity;

varying float vAlpha;

void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));

    // Firefly-style glow falloff
    float glow = clamp(0.05 / max(distanceToCenter, 0.001) - 0.1, 0.0, 1.0);
    if (glow <= 0.0)
        discard;

    gl_FragColor = vec4(uColor * uIntensity, glow * vAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
