uniform vec3 uColor;
uniform float uIntensity;

varying float vLife;

void main() {
    // Soft round dust mote
    float strength = smoothstep(0.5, 0.15, distance(gl_PointCoord, vec2(0.5)));

    // Quick pop in, long fade out over the rise
    float alpha = smoothstep(0.0, 0.08, vLife)
        * (1.0 - smoothstep(0.45, 1.0, vLife));

    // Intensity pushes the color beyond 1 so the bloom pass makes it glow
    gl_FragColor = vec4(uColor * uIntensity, alpha * strength);
}
