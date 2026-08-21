uniform sampler2D uVoronoiTexture;
uniform sampler2D uPerlinTexture;
uniform float uRepeat;
uniform float uPerlinScale;
uniform float uPerlinStrength;
uniform float uPerlinSpeed;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uProgress; // voronoi reveal: 0 = none, 1 = full lava pattern
uniform float uThickness; // voronoi edge softness
uniform float uCharFormProgress; // 0 = only lava, 1 = formed character
uniform float uAlphaClip; // discard fragments below this alpha (no depth write)

// Per-part colors; the vertex colors are part markers (black / white / red),
// not display colors
uniform vec3 uBlackColor;
uniform vec3 uWhiteColor;
uniform float uWhiteIntensity;
uniform vec3 uRedColor;

varying vec3 vClampedPos;
varying vec3 vNormalizedNormal;
varying vec3 vPartMask;

vec4 triplanar(sampler2D tex, vec3 p01, vec3 n, float repeat, vec2 uvOffset) {
    vec3 w = pow(abs(normalize(n)), vec3(8.0));
    w /= max(w.x + w.y + w.z, 1e-5);

    vec2 uvX = p01.zy * repeat + uvOffset;
    vec2 uvY = p01.xz * repeat + uvOffset;
    vec2 uvZ = p01.xy * repeat + uvOffset;

    vec4 cx = texture2D(tex, uvX);
    vec4 cy = texture2D(tex, uvY);
    vec4 cz = texture2D(tex, uvZ);

    return cx * w.x + cy * w.y + cz * w.z;
}

void main() {
    vec2 perlinScroll = vec2( uPerlinSpeed, -uTime * uPerlinSpeed * 0.5);

    float perlin = triplanar(
        uPerlinTexture,
        vClampedPos,
        vNormalizedNormal,
        uPerlinScale,
        perlinScroll
    ).r;
    vec2 deform = vec2(perlin - 0.5) * uPerlinStrength;

    float vTex = triplanar(
        uVoronoiTexture,
        vClampedPos,
        vNormalizedNormal,
        uRepeat,
        deform
    ).r;

    float lower = 1.0 - uProgress;
    vTex = smoothstep(lower, lower + uThickness, vTex);

    vec4 lavaColor = vec4(vec3(uIntensity * vTex * uColor), vTex);

    // Only white carries green, red carries red without green, black neither.
    // Normalized so interpolated pixels on part borders still blend to 1
    float whiteMask = vPartMask.g;
    float redMask = vPartMask.r * (1.0 - vPartMask.g);
    float blackMask = 1.0 - max(vPartMask.r, vPartMask.g);
    float maskSum = max(blackMask + whiteMask + redMask, 1e-4);
    vec3 partColor = (uBlackColor * blackMask + uWhiteColor * whiteMask + uRedColor * redMask) / maskSum;

    vec4 lanternColor = vec4(partColor, csm_DiffuseColor.a);

    csm_DiffuseColor = vec4(mix(lavaColor, lanternColor, uCharFormProgress));

    // The white part gets its constant unlit color in a final gl_FragColor
    // override injected by useLanternMaterial (after lights, cloud shadows
    // and tone mapping); here it only feeds the dissolve/border blend

    if (csm_DiffuseColor.a < uAlphaClip) discard;
}
