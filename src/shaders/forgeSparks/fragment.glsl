uniform float uProgress;
uniform vec3 uColor;
uniform float uIntensity;

void main() {
    vec2 uv = gl_PointCoord;
    float distanceToCenter = length(uv - vec2(0.5));

    if(distanceToCenter > 0.5)
        discard;

    // Final color
    gl_FragColor = vec4(uColor, 1.0);
    gl_FragColor.rgb *= uIntensity * (1.0 - uProgress);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
