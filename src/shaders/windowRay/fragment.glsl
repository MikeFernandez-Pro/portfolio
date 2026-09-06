uniform vec3 uColor;
uniform float uOpacity;
uniform float uStart;
uniform float uEnd;
uniform float uSmoothness;
uniform float uEdgeSmoothness;
uniform float uAngleFadeStrength;
uniform float uAngleFadePower;

varying float vRayCoord;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
    // 0 at uStart (ray coord 1, window end, full opacity) down to 1 at uEnd
    // (ray coord 0, ground end)
    float progress = clamp((uStart - vRayCoord) / (uStart - uEnd), 0.0, 1.0);

    // uSmoothness shapes the falloff (1 = linear, higher = fades sooner,
    // lower = longer bright core)
    float ray = pow(1.0 - progress, uSmoothness);
 
    // Clip outside [uEnd, uStart] so the sliders shrink the ray from its
    // extremities instead of just moving the fade zone
    ray *= step(vRayCoord, uStart) * step(uEnd, vRayCoord);

    // Soften the ray sides
    float edges = smoothstep(0.0, uEdgeSmoothness, vUv.x)
        * (1.0 - smoothstep(1.0 - uEdgeSmoothness, 1.0, vUv.x));

    // View-angle fade: faces seen edge-on melt away instead of drawing the
    // volume's hard corners (abs: the material is DoubleSide). Relies on the
    // smoothed normals so the fade wraps continuously around the beam.
    float facing = abs(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos)));
    float angleFade = pow(facing, max(uAngleFadePower, 0.0001));
    float angles = mix(1.0, angleFade, uAngleFadeStrength);

    gl_FragColor = vec4(uColor, ray * edges * angles * uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
