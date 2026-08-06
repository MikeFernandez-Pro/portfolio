uniform sampler2D uVoronoiTexture;
uniform sampler2D uPerlinNoise;
uniform float uTime;
uniform float uSize;
uniform float uSpeed;
uniform vec3 uCrustColor;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uContrast;
uniform float uBorderThicknessX;
uniform float uBorderThicknessY;
uniform float uPerlinNoiseStrength;

varying vec3 vLavaPosition;
varying vec3 vLavaNormal;
varying vec2 vUv;

void main() {
    float t = uTime * uSpeed;

    float perlinNoisePattern = texture2D(uPerlinNoise, vUv * uSize + t).r;
    perlinNoisePattern *= uPerlinNoiseStrength;

    float  lavaPattern = texture2D(uVoronoiTexture, vUv * uSize + perlinNoisePattern).r;
    vec3 lavaColor = mix(uCrustColor, uGlowColor, lavaPattern);


    // Square border along the plane edges, slightly feathered
    vec2 edgeDist = min(vUv, 1.0 - vUv);
    float borderX = 1.0 - smoothstep(uBorderThicknessX, uBorderThicknessX + 0.005, edgeDist.x);
    float borderY = 1.0 - smoothstep(uBorderThicknessY, uBorderThicknessY + 0.005, edgeDist.y);
    float border = max(borderX, borderY);
    lavaColor = mix(lavaColor, uGlowColor, border);

    csm_DiffuseColor = vec4(lavaColor, 1.0);
     csm_Emissive = lavaColor * uIntensity;
}
