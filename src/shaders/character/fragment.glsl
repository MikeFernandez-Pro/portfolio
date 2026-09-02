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

varying vec3 vClampedPos;
varying vec3 vNormalizedNormal;

vec4 triplanar(sampler2D tex, vec3 p01, vec3 n, float repeat, vec2 uvOffset) {
    // interpolated normals can cancel to ~zero length, and normalize() of a
    // zero vector is NaN — same math, with the length floored
    vec3 w = pow(abs(n) / max(length(n), 1e-5), vec3(8.0));
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

    // perlin = green channel of the packed voronoi/perlin texture
    float perlin = triplanar(
        uPerlinTexture,
        vClampedPos,
        vNormalizedNormal,
        uPerlinScale,
        perlinScroll
    ).g;
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
    vec4 characterColor = csm_DiffuseColor;

    csm_DiffuseColor = vec4(mix(lavaColor, characterColor, uCharFormProgress));

    if (csm_DiffuseColor.a < uAlphaClip) discard;
}
