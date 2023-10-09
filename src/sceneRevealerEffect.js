import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /*glsl*/ ` 
    uniform float progress;
    uniform float time;
    uniform float thickness;
    uniform float offset;
    uniform float size;
    uniform float aspectRatio;

//	https://www.shadertoy.com/view/lsjGWD
//	by Pietro De Nicola
//
vec2 hash( vec2 p ){
	p = vec2( dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
	return fract(sin(p)*43758.5453);
}

float voronoi( in vec2 x ){
     bool  multiply_by_F1	= mod(10.0 ,8.0)  >= 4.0;
 bool  inverse				= mod(10.0 ,16.0) >= 8.0;


	vec2 n = floor( x );
	vec2 f = fract( x );
	
	float F1 = 8.0;
	float F2 = 8.0;
	
	for( int j=-1; j<=1; j++ )
		for( int i=-1; i<=1; i++ ){
			vec2 g = vec2(i,j);
			vec2 o = hash( n + g );

			o = 0.5 + 0.41*sin(  6.2831*o );	
			vec2 r = g - f + o;

		float d = thickness *   dot(r,r);

		if( d<F1 ) { 
			F2 = F1; 
			F1 = d; 
		} else if( d<F2 ) {
			F2 = d;
		}
    }
	
	float c = F2-F1;
		
	if( inverse ) {
        c = progress - c;
        // c = time * 1.2  - c;
    }
	
    return c;
}


    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

        
        vec2 centeredUv = vUv - 0.5;
        // centeredUv.y /= aspectRatio;
        float distanceToCenter = length(centeredUv);

        vec2 customUv = vec2(vUv.x * 7.0, vUv.y * 7.0  + offset  );

        float noise = voronoi(customUv);

  
    noise += step( 0.1, noise);
    noise = clamp(noise, 0.0, 1.0);
    
    vec4 glassColor = inputColor; // remove noise2
    glassColor.rgb *= vec3(0.2, 0.2, 0.2);

      // Apply a simple Gaussian blur
      vec4 blurredColor = vec4(0.5, 0.5, 0.5, 1.0);
      float blurRadius = 0.005; // Adjust the blur radius as needed
  
      for (float i = -1.0; i <= 1.0; i += 1.0) {
          for (float j = -1.0; j <= 1.0; j += 1.0) {
              vec2 blurOffset = vec2(i, j) * blurRadius;
              blurredColor += texture(inputBuffer, uv + blurOffset * 0.60);
          }
      }
      blurredColor /= 49.0; // Adjust for the number of samples
      
      glassColor = blurredColor;
      glassColor *= vec4(1.0, 1.0, 1.0, 1.0);

    if (distanceToCenter < size) {
        // outputColor = inputColor;
        outputColor = mix(glassColor, inputColor, noise);
    }
    else {
        outputColor =  glassColor;
    }
}
    `;

export default class sceneRevealerEffect extends Effect {
    constructor(progress, thickness, offset, size, aspectRatio) {
        super("sceneRevealerEffect", fragmentShader, {
            uniforms: new Map([
                ["progress", new Uniform(progress)],
                ["thickness", new Uniform(thickness)],
                ["offset", new Uniform(offset)],
                ["size", new Uniform(size)],
                ["aspectRatio", new Uniform(aspectRatio)],

                ["time", new Uniform(0.0)],
            ]),
        });
    }

    update(renderer, inputBuffer, deltaTime) {
        // console.log(this.uniforms.get("progress").value);
        this.uniforms.get("time").value += deltaTime;
    }
}
