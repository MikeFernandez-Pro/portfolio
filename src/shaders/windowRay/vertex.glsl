// Beam end-cap centers in model space, measured from the mesh — the side
// quads are unwrapped in mixed directions (uv.y runs window-to-ground on
// some faces and ground-to-window on others), so the along-beam coordinate
// has to come from the vertex position instead of uv.y
const vec3 WINDOW_END_CENTER = vec3(-19.283, -0.941, 3.039);
const vec3 GROUND_END_CENTER = vec3(-22.603, -1.883, 6.543);

varying float vRayCoord;
varying vec2 vUv;

void main() {
    vec3 rayAxis = GROUND_END_CENTER - WINDOW_END_CENTER;

    // 1 at the window extremity, 0 at the ground one
    vRayCoord = 1.0
        - clamp(
            dot(position - WINDOW_END_CENTER, rayAxis) / dot(rayAxis, rayAxis),
            0.0,
            1.0
        );

    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
