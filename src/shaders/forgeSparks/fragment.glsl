uniform float uProgress;

void main() {
    vec2 uv = gl_PointCoord;
    float distanceToCenter = length(uv - vec2(0.5));

    if(distanceToCenter > 0.5)
        discard;

    // Final color
    gl_FragColor = vec4(1.0, 0.5, 0.5, 1.0);
    gl_FragColor.rgb *= 2.0 * (1.0 - uProgress);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}