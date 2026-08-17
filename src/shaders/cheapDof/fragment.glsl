uniform float uFocusDistance;
uniform float uFocusRange;
uniform float uBokehRadius;
uniform float uSamples;
uniform float uDebugFocus;

const float GOLDEN_ANGLE = 2.399963229728653;
const float TWO_PI = 6.28318530718;

float random(vec2 seed) {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// readDepth / getViewZ / cameraNear / cameraFar / aspect / resolution are
// provided by postprocessing's effect shader template (EffectAttribute.DEPTH)
float sceneDistance(const in float d) {
    return -getViewZ(d);
}

// Circle of confusion: 0 at the focal plane, 1 once uFocusRange world units
// away from it
float cocFromDistance(const in float dist) {
    return smoothstep(0.0, uFocusRange, abs(dist - uFocusDistance));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    float centerDist = sceneDistance(depth);
    float centerCoC = cocFromDistance(centerDist);

    // CoC visualization for tuning: green = in focus, red = fully blurred
    if (uDebugFocus > 0.5) {
        outputColor = mix(vec4(0.0, 1.0, 0.0, 1.0), vec4(1.0, 0.0, 0.0, 1.0), centerCoC);
        return;
    }

    // In-focus pixels skip the blur loop entirely
    if (centerCoC < 0.01) {
        outputColor = inputColor;
        return;
    }

    // Vogel/golden-angle spiral disk blur, rotated per pixel to hide the
    // spiral pattern; radius in fractions of screen height
    float radius = centerCoC * uBokehRadius;
    vec2 aspectCorrection = vec2(1.0 / aspect, 1.0);
    float phi = random(uv * resolution) * TWO_PI;

    vec4 acc = inputColor;
    float weightSum = 1.0;

    for (float i = 0.0; i < uSamples; i++) {
        float r = sqrt((i + 0.5) / uSamples);
        float theta = i * GOLDEN_ANGLE + phi;
        vec2 tapUv = uv + r * vec2(cos(theta), sin(theta)) * radius * aspectCorrection;

        // Scatter-as-gather: taps behind the center pixel inherit its CoC,
        // taps in front use their own — keeps sharp foreground from bleeding
        // over blurred background while blurred foreground still spills over
        // sharp areas
        float tapDist = sceneDistance(readDepth(tapUv));
        float tapCoC = cocFromDistance(tapDist);
        float w = (tapDist > centerDist) ? centerCoC : max(tapCoC, 0.1);

        acc += texture2D(inputBuffer, tapUv) * w;
        weightSum += w;
    }

    outputColor = acc / weightSum;
}
