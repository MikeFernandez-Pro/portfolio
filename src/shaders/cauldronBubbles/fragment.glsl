uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uCoreOpacity;
uniform float uRimThickness;

varying float vAlpha;

void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));

    if (distanceToCenter > 0.5)
        discard;

    // Bubble look: bright rim around the inside, whose fill is tunable
    // (uCoreOpacity 0 = hollow ring, 1 = full disc)
    float rim = smoothstep(0.48 - uRimThickness, 0.48, distanceToCenter);
    float alpha = mix(uCoreOpacity, 1.0, rim) * vAlpha * uOpacity;

    gl_FragColor = vec4(uColor * uIntensity, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
