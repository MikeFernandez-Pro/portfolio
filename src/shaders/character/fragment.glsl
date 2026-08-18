uniform sampler2D uVoronoiTexture;
uniform float uRepeat;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uProgress; // voronoi reveal: 0 = none, 1 = full lava pattern
uniform float uThickness; // voronoi edge softness
uniform float uCharFormProgress; // 0 = only lava, 1 = formed character
uniform float uAlphaClip; // discard fragments below this alpha (no depth write)

varying vec3 vClampedPos;
varying vec3 vNormalizedNormal;

vec4 triplanar(sampler2D tex, vec3 p01, vec3 n, float repeat) {
    vec3 w = pow(abs(normalize(n)), vec3(8.0));
    w /= max(w.x + w.y + w.z, 1e-5);

    vec2 uvX = p01.zy * repeat; // project onto YZ
    vec2 uvY = p01.xz * repeat; // project onto XZ
    vec2 uvZ = p01.xy * repeat; // project onto XY

    vec4 cx = texture2D(tex, uvX);
    vec4 cy = texture2D(tex, uvY);
    vec4 cz = texture2D(tex, uvZ);

    return cx * w.x + cy * w.y + cz * w.z;
}

void main() {

    float vTex = triplanar(uVoronoiTexture, vClampedPos, vNormalizedNormal, uRepeat).r;

    // Voronoi lava — controlled ONLY by uProgress (reveal) + uThickness (edge)
    float lower = 1.0 - uProgress;
    vTex = smoothstep(lower, lower + uThickness, vTex);

    vec4 lavaColor = vec4(vec3(uIntensity * vTex * uColor), vTex);
    vec4 characterColor = csm_DiffuseColor;

    // Character form fades in over the lava — controlled ONLY by uCharFormProgress
    csm_DiffuseColor = vec4(mix(lavaColor, characterColor, uCharFormProgress));

    // Discard near-transparent fragments so they don't write depth — otherwise
    // depthWrite=true shows the character's silhouette while it's invisible
    if (csm_DiffuseColor.a < uAlphaClip) discard;
}