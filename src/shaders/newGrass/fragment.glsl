uniform vec2 uResolution;
uniform float uTime;


float inverseLerp(float value, float minValue, float maxValue) {
    return (value - minValue) / (maxValue - minValue);
}

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(value, inMin, inMax);
    return mix(outMin, outMax, t);  
}      

float saturate(float value) {
    return clamp(value, 0.0, 1.0);
}   

void main() {
    
    vec3 color = vec3(0.0);

    gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}           