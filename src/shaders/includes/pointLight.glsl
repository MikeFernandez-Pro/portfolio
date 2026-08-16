// Old-school point light (Three.js Journey shading lesson): lambert shading
// + phong specular + shaped decay. Not physically based, but cheap.
// decayPower shapes the falloff inside the radius set by lightDecay:
// 1.0 = linear, > 1.0 = sharp hot core, < 1.0 = smooth spread-out pool.
vec3 pointLight(
  vec3 lightColor,
  float lightIntensity,
  vec3 normal,
  vec3 lightPosition,
  vec3 viewDirection,
  float specularPower,
  vec3 position,
  float lightDecay,
  float decayPower
) {
    vec3 lightDelta = lightPosition - position;
    float lightDistance = length(lightDelta);

    // Decay first: fragments outside the light radius skip the shading and
    // specular work entirely. The branch is spatially coherent (neighboring
    // fragments are in/out of the same lights together), so it's cheap.
    float decay = 1.0 - lightDistance * lightDecay;
    if (decay <= 0.0) {
        return vec3(0.0);
    }
    decay = pow(decay, decayPower);

    vec3 lightDirection = normalize(lightDelta);
    vec3 lightReflection = reflect(-lightDirection, normal);

    // Shading
    float shading = dot(normal, lightDirection);
    shading = max(0.0, shading);

    // Specular
    float specular = -dot(lightReflection, viewDirection);
    specular = max(0.0, specular);
    specular = pow(specular, specularPower);

    return lightColor * lightIntensity * decay * (shading + specular);
}
