uniform vec3 uColor;
uniform float uIntensity;

varying float vAlpha;

void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));

    if (distanceToCenter > 0.5)
        discard;

    // Bubble look: thin bright rim around a faint core
    float rim = smoothstep(0.18, 0.48, distanceToCenter);
    float alpha = mix(0.15, 1.0, rim) * vAlpha;

    gl_FragColor = vec4(uColor * uIntensity, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
