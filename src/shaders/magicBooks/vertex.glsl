uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;

varying vec3 vClampedPos;
varying vec3 vNormalizedNormal;

void main() {
    vec3 size = max(uBoundsMax - uBoundsMin, vec3(1e-5));

    vClampedPos = clamp((csm_Position - uBoundsMin) / size, 0.0, 1.0);
    vNormalizedNormal = normalize(csm_Normal);
}
