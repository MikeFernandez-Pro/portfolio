varying vec3 vLavaPosition;
varying vec3 vLavaNormal;
varying vec2 vUv;

void main() {
    vLavaPosition = csm_Position;
    vLavaNormal = normalize(csm_Normal);
    vUv = uv;
}
