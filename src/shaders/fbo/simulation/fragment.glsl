
uniform sampler2D uPosition;
uniform sampler2D uOriginalPosition;
uniform vec3 uMouse;
uniform float uTime;

varying vec2 vUv;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {

    float offset = rand(vUv);

    vec2 position = texture2D(uPosition, vUv).xy;
    vec2 original = texture2D(uOriginalPosition, vUv).xy;
    vec2 velocity = texture2D(uPosition, vUv).zw;

      // position.y += sin(position.x * uTime * 10. ) * 0.1;   // Vitesse agitation particles axe Y
      // position.x += sin(position.y * uTime * 10.) * 0.1; // Vitesse agitation particles axe Xq
      // position.x += uTime * 0.01; // Vitesse de déplacement des particles axe X
    original.y += sin(original.x + uTime * 2.0) * 0.02; // CETTE LIGNE POUR DESACTIVER VAGUES

    velocity *= 0.99;

      // particle attraction to shape force
    vec2 direction = normalize(original - position);
    float dist = length(original - position);
    if(dist > 0.01) {
        velocity += direction * 0.0005;
    }

      // mouse repel force
    float mouseDistance = distance(position, uMouse.xy);
    float maxDistance = 0.45;
    if(mouseDistance < maxDistance) {
        vec2 direction = normalize(position - uMouse.xy);
        velocity += direction * (1.0 - mouseDistance / maxDistance) * 0.01;
    }

      // lifespan of a particle
    float lifespan = 20.;
    float age = mod(uTime + lifespan * offset, lifespan);
    if(age < 0.1) {
        velocity = vec2(0.001, 0.001);
        position.xy = original;
    }

    position.xy += velocity;

    gl_FragColor = vec4(position, velocity);
}