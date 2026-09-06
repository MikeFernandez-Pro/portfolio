uniform vec3 uColor;
uniform float uOpacity;
uniform float uDensity;
uniform float uSpeed;
uniform float uEdgeFade;
uniform float uTopFadeStart;
uniform float uTopFadeEnd;
uniform float uBottomFadeStart;
uniform float uBottomFadeEnd;
uniform sampler2D uSmokeTexture;

varying float positionY;
varying vec2 vUv;
varying float vTime;

void main() {

    // Texture rotated 90 degrees: local x reads the texture's y axis and the
    // upward scroll runs along the texture's x axis, at uSpeed
    vec2 uv = vec2(vUv.y - vTime * uSpeed, vUv.x);
    float smoke = texture2D(uSmokeTexture, uv).r;

    // Gamma curve: density < 1 pushes the mid values toward opaque without
    // flattening them (unlike a multiply + clamp), > 1 thins the smoke out
    smoke = pow(smoke, max(uDensity, 0.0001));

    // Slight fade on the plane's vertical edges (uEdgeFade = fade width in
    // plane units, 0 = hard edges)
    float edgeFade = smoothstep(0.0, max(uEdgeFade, 0.0001), min(vUv.x, 1.0 - vUv.x));

    // Fade the column out as it rises: full below uTopFadeStart, gone at
    // uTopFadeEnd
    float topFade = 1.0 - smoothstep(uTopFadeStart, max(uTopFadeEnd, uTopFadeStart + 0.0001), vUv.y);

    // Fade the base in: gone below uBottomFadeStart, full at uBottomFadeEnd
    float bottomFade = smoothstep(uBottomFadeStart, max(uBottomFadeEnd, uBottomFadeStart + 0.0001), vUv.y);

    float alpha = smoke * edgeFade * topFade * bottomFade * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
}