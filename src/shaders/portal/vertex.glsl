varying vec2 vUv;
varying vec3 vViewDirTangent;

void main()
{
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;

    vUv = uv;

    // Tangent basis of the portal plane straight from the model matrix
    // (the disc faces +Z, u runs along +X, v along +Y)
    vec3 tangent = normalize(vec3(modelMatrix[0]));
    vec3 bitangent = normalize(vec3(modelMatrix[1]));
    vec3 normal = normalize(vec3(modelMatrix[2]));

    // Camera-to-surface direction in tangent space, drives the fake
    // interior parallax of the project image in the fragment shader
    vec3 viewDir = worldPosition.xyz - cameraPosition;
    vViewDirTangent = vec3(
      dot(viewDir, tangent),
      dot(viewDir, bitangent),
      dot(viewDir, normal)
    );
}
