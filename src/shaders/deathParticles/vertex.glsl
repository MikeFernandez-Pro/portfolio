uniform float uProgress;
uniform float uSize;
uniform float uRiseHeight;
uniform vec2 uResolution;

attribute float aScale;
// x: rise speed multiplier, y: start delay, z: sway phase
attribute vec3 aRandom;

varying float vLife;

void main() {
    // Per-particle life: delayed start (staggers the burst), normalized so
    // every particle still ends its life exactly when uProgress reaches 1
    float life = clamp((uProgress - aRandom.y) / (1.0 - aRandom.y), 0.0, 1.0);
    vLife = life;

    vec3 newPosition = position;
    newPosition.y += life * uRiseHeight * aRandom.x;

    // Gentle sway while rising, scaled by life so the burst starts tight on
    // the character silhouette and loosens as the dust climbs
    float phase = aRandom.z * 6.2831853;
    newPosition.x += sin(life * 9.0 + phase) * 0.05 * life;
    newPosition.z += cos(life * 7.0 + phase) * 0.05 * life;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Dust motes shrink as they rise
    gl_PointSize = uSize * aScale * (1.0 - life * 0.6);
    gl_PointSize *= uResolution.y;
    gl_PointSize *= (1.0 / -viewPosition.z);
}
