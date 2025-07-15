#define M_PI 3.1415926535897932384626433832795


uniform float uAspectRatio;
uniform vec2 uResolution;
uniform float uBlurStrength;
uniform vec2 uCenter;
uniform float uBlurCenterSize;
uniform float uBlurSmoothness;
uniform bool uIsHorizontal;

vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3846153846) * direction;
    vec2 off2 = vec2(3.2307692308) * direction;
    color += texture2D(image, uv) * 0.2270270270;
    color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
    color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
    color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
    color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
    return color;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

    float blurStrength = uBlurStrength;
    
    // Calculate distance from center (0.5, 0.5) and make it circular
    vec2 center = uCenter;
    float dist = distance(uv, center);
    
    // Adjust for aspect ratio if needed
    vec2 aspectUv = uv;
    aspectUv.x *= uAspectRatio;
    center.x *= uAspectRatio;
    float aspectDist = distance(aspectUv, center);

    // Create circular blur strength (0 at center, 1 at edges)
    float circularBlurStrength = smoothstep(uBlurCenterSize, uBlurSmoothness, aspectDist);
    
    vec4 horizontalBlur = blur9(inputBuffer, uv, uResolution, vec2(uIsHorizontal ? blurStrength : 0.0, uIsHorizontal ? 0.0 : blurStrength));
    vec4 horizontalBlurColor = mix(inputColor, horizontalBlur, circularBlurStrength);

    outputColor = horizontalBlurColor;
    
}