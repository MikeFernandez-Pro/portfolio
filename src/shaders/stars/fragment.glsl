uniform sampler2D uTexture;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uBrightness;

varying float vColor;


void main() {
    vec4 textureColor = texture2D(uTexture, gl_PointCoord);
    float alpha = textureColor.r;

    if(vColor < 0.33) {
        gl_FragColor = vec4(uColor1 * uBrightness , alpha);
    } else if(vColor < 0.66) { 
        gl_FragColor = vec4(uColor2 * uBrightness * 1.5, alpha);
    } else {
        gl_FragColor = vec4(uColor3 * uBrightness * 2.0, alpha);
    }

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}