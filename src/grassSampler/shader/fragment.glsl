varying float vPosY;

void main() {
    // Create a grandient color based on the Y position of the vertex
    vec3 finalColor = vec3(0.31, 0.75, 0.35) * (vPosY + 0.1);
    gl_FragColor = vec4(finalColor, 1.0);
}
