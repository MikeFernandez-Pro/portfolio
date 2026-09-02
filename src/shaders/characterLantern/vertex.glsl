uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;

// Vertex colors mark the lantern parts (black / white / red), they are not
// display colors. USE_COLOR stays off so three doesn't tint the diffuse;
// the attribute binds to the geometry's COLOR_0 by name.
attribute vec4 color;

varying vec3 vClampedPos;
varying vec3 vNormalizedNormal;
// centroid: with MSAA the pixel center can sit outside a small triangle
// and extrapolate vertex colors past 0–1, which blows up the unlit mix
centroid varying vec3 vPartMask;

void main() {
    vec3 size = max(uBoundsMax - uBoundsMin, vec3(1e-5));

    vClampedPos = clamp((csm_Position - uBoundsMin) / size, 0.0, 1.0);
    vNormalizedNormal = normalize(csm_Normal);
    vPartMask = color.rgb;
}
