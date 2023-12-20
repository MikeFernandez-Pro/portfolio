uniform float uTime;
uniform float uOffset;

varying vec2 vUv;
void main() {

    if (uv.x > uOffset) {
                csm_Position.z += sin(csm_Position.x * 5.0 - (uTime * 2.0) + uOffset) * 0.1;  
                csm_Position.z += sin(csm_Position.x * 2.0 - (uTime * 2.0)) * 0.1;  
                
            }
    // csm_Position.y += sin(csm_Position.x * 3.0 - (uTime * 20.0)) * pow(position.x, 20.0) * 0.1;
    vUv = uv;
}

