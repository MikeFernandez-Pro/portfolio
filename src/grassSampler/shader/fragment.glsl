varying float vPosY;

void main()
{   

    // vec3 finalColor = vec3(0.23, 0.56, 0.27) * max((vPosY), 0.1);
    vec3 finalColor = vec3(0.31, 0.75, 0.35) * (vPosY + 0.1);
    gl_FragColor = vec4(finalColor, 1.0);
}
