uniform sampler2D uTournesolTexture;

varying vec3 vColor;
varying vec2 vUv;

void main() {


  vec4 tournesolColor = texture2D(uTournesolTexture, vUv);
  tournesolColor.rgb = mix(tournesolColor.rgb, vec3(0.0), 1.0 - vUv.y) ;

  if (vUv.x == 0.0 && vUv.y == 0.0) {
    gl_FragColor = vec4(vColor, 1.0);
  } else {

    if (tournesolColor.a < 0.9) {
      discard;
    } else {
      gl_FragColor = vec4(tournesolColor);
    }
    
    
  }


}
