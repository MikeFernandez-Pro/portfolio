import { Clone, shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const ashes = {
    size: 60,
    scale: [0.5, 1, 0.5],
    offsets: [
        [-12.85, 2.00, -36.78],
        [-30.77, 6.62, -79.09],
        [-40.71, 6.61, -79.41],
        [-41.16, 6.57, -68.95],
        [-24.17, 8.88, -104.15],
        [-33.97, 8.78, -117.45],
        [-10.42, 8.81, -117.77]
    ]
}
const number = ashes.offsets.length;

const amount = 40;

const totalNumber = number * amount;

const test = new Float32Array(totalNumber * 3);

let cpt = 0; // Start with 0 since array indices start at 0
let currentAshes = totalNumber / number;

for (let i = 0; i < totalNumber; i++) {
    if (i >= currentAshes * (cpt + 1)) {
        cpt++;
    }
    test[i * 3 + 0] = ashes.offsets[cpt][0];
    test[i * 3 + 1] = ashes.offsets[cpt][1];
    test[i * 3 + 2] = ashes.offsets[cpt][2];
}



/* 
Small Torches

size: 60
scale: [0.5, 1, 0.5],
offsets  = [
    [-12.85, 2.00, -36.78] , -
    [-30.77, 6.62, -79.09 ] , 
    [-40.71, 6.61, -79.41], 
    [-41.16, 6.57, -68.95], ,
    [-24.17, 8.88, -104.15],
    [-33.97, 8.78, -117.45],
    [-10.42, 8.81, -117.77] 
]


count: 40
*/

/*
Medium Torches 

    size : 80,
    scale: [0.8, 0.8, 1.3],
    offsets : [
        [-7.86, 6.58, -72.52],
        [-16.43, 6.58, -72.50]
    ]
    count: 40
*/

/*
Campfire
size: 180,
scale: [1.5, 3, 1.85],
offset : [-0.94, 2.40, -37.16]
count: 40
*/


const particlesCount = 40;
const COUNT = particlesCount * ashes.offsets.length;

const Ashes = () => {

    const ashesRef = useRef()

    const gl = useThree(state => state.gl);

    const positions = new Float32Array(COUNT * 3);
    const offsets = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const elevation = new Float32Array(COUNT);


    let cpt = 1;

    for (let i = 0; i < COUNT; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = 0;

        if (i > (COUNT / ashes.offsets.length) * cpt) {
            cpt++;
        }
        
        offsets[i * 3 + 0] = ashes.offsets[cpt - 1][0]
        offsets[i * 3 + 1] = ashes.offsets[cpt - 1][1]
        offsets[i * 3 + 2] = ashes.offsets[cpt - 1][2]

        scales[i] = Math.random() * 0.5 + 0.5;

        elevation[i] = 5 + Math.random() * 25.0;
    }

    const controls = useControls("Ashes", {
        size: 60,
        color: "#f85f3d",
        position: { value: [-5.76, 1.9, -16.5], step: 0.1 },
        scale: { value: [0.45, 0.9, 0.45], step: 0.01 },
        uOffsetPos: { value: [0, 2.8, 0], step: 0.01 },
    })

    const AshesMaterial = shaderMaterial(
        {
            uSize: controls.size * gl.getPixelRatio(),
            uTime: 0,
            uColor: new THREE.Color(controls.color),
            uSpeed: 6,
            uOffsetPos: controls.uOffsetPos,
        },
        `
            uniform float uSize;
            uniform float uTime;
            uniform float uSpeed;
            uniform vec3 uOffsetPos;
            uniform float uOffsetPosY;
            uniform float uOffsetPosZ;

            attribute float aScale;
            attribute float aElevation;
            attribute vec3 aOffset;

            varying float vPosY;

            void main()
            {
                /**
                 * Position
                 */
                vec3 newPosition = position;
            
               
          
                newPosition.y = mod(uTime * uSpeed, aElevation) * 0.03;
                

                newPosition.x /= max(0.9, (newPosition.y) * 10.0);
                newPosition.x += cos(newPosition.y * 30.0) * 0.01;

                vPosY = newPosition.y;
                
                newPosition.y += aOffset.y;
                newPosition.x += aOffset.x;
                newPosition.z += aOffset.z;
                
                vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
                
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;

                /**
                 * Size
                 */
    
                gl_PointSize = min((uSize * aScale) , pow((uSize * aScale) / ((newPosition.y - aOffset.y) * (uSize * aScale)), 2.0) * 10.0 ) ;
                gl_PointSize *= (1.0 / - viewPosition.z);

           

            
            }
        `,
        `
    uniform vec3 uColor;
    uniform float uTime;

            varying float vPosY;

        void main() {
            // Circle Shape
            float strength = distance(gl_PointCoord, vec2(0.5));
            strength = step(0.5, strength);
            strength = 1.0 - strength;

            vec3 gradientColor = uColor / (max( 0.1, vPosY) * 255.0);
 
            vec3 color = mix(vec3(0.0), gradientColor, strength);
            gl_FragColor = vec4(color, 1.0) * min((10.0), 1.0 / (vPosY )) ;
            // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
        `
    )

    extend({ AshesMaterial })

    useFrame((state, delta) => {
        ashesRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
        ashesRef.current.material.uniforms.uSize.value = controls.size;
        ashesRef.current.material.uniforms.uColor.value = new THREE.Color(controls.color);
        ashesRef.current.material.uniforms.uOffsetPos.value = controls.uOffsetPos;
    })


    return (
        <points ref={ashesRef} position-y={2} scale={controls.scale} frustumCulled={false}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={COUNT}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aScale"
                    count={COUNT}
                    array={scales}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aElevation"
                    count={COUNT}
                    array={elevation}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aOffset"
                    count={COUNT}
                    array={offsets}
                    itemSize={3}
                />
            </bufferGeometry>
            <ashesMaterial
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexColors={true}
                toneMapped={false}
            />
        </points>
    );
};

export default Ashes;