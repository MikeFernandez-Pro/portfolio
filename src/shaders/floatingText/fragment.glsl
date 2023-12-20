uniform sampler2D uTexture;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uIntensity;

        varying vec2 vUv;

        void main()
{
    vec4 textureColor = texture2D(uTexture, vUv);
    textureColor.rgb = mix(textureColor.rgb, vec3(uColor), 1.0) * uIntensity;
    textureColor.a *= uOpacity;
    gl_FragColor = textureColor;
}