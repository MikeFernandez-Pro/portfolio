import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import * as THREE from 'three';


const firefliesPositions = [
    [-0.7, 2.3, -3.8],
    [0.7, 2.3, -3.8],
    [2.9, 2.3, -17.8],
    [4.2, 2.3, -17.6],
    [4, 4.3, -24.1],
    [5.25, 4.3, -23.9],
    [-0.25, 4.3, -29.15],
    [-0.1, 4.3, -30.5],
    [-6.6, 6.4, -29.9],
    [-6.4, 6.4, -31.2],
    [-9.2, 6.35, -35.6],
    [-10.5, 6.35 , -35.6],
    [-10.5, 8.45 , -41.9],
    [-9.15, 8.45 , -41.9],
]

const FireFlies = () => {

    const controls = useControls("FireFlies", {
        count: { value: 30, min: 0, max: 100, step: 1 },
        uSize: { value: 30, min: 0, max: 1000, step: 1 },
        velocity: { value: 0.17, min: 0, max: 1, step: 0.01 },
        color: "#ffcaaf",
        intensity: { value: 8, min: 0, max: 50, step: 0.01 },
    });


    const pixelRatio = useThree(state => state.gl).getPixelRatio();

    const firefliesGeometry = new THREE.BufferGeometry();
    const firefliesPerLamp = 20;
    const totalFirefliesCount = firefliesPositions.length * firefliesPerLamp;

    const positionsArray = new Float32Array(totalFirefliesCount * 3);
    const scalesArray = new Float32Array(totalFirefliesCount);

    let currrentLampCount = 1;
    for (let i = 0; i < totalFirefliesCount; i++) {
        if (i > (totalFirefliesCount / firefliesPositions.length) * currrentLampCount) {
            currrentLampCount++;
        }
        
        positionsArray[i * 3 + 0] = ((Math.random() - 0.5) * 0.6) + firefliesPositions[currrentLampCount - 1][0];
        positionsArray[i * 3 + 1] = ((Math.random() - 0.5) * 0.3) + firefliesPositions[currrentLampCount - 1][1];
        positionsArray[i * 3 + 2] = ((Math.random() - 0.5) * 0.6) + firefliesPositions[currrentLampCount - 1][2];
        scalesArray[i] = Math.random() * 0.5 + 0.5;
    }

    const ref = useRef();


    const FirefliesShaderMaterial = shaderMaterial(
        {
            uPixelRatio: pixelRatio,
            uSize: controls.uSize,
            uTime: 0,
            uVelocity: controls.velocity,
            uColor: new THREE.Color(controls.color),
            uIntensity: controls.intensity,
        },
        `
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uTime;
        uniform float uVelocity;

        attribute float aScale;
        varying float vScale;
        
        void main() {
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            modelPosition.x += sin(modelPosition.y  + uTime + (aScale * 15.0)) * uVelocity;
            modelPosition.y += sin(modelPosition.x  + uTime + (aScale * 15.0)) * uVelocity + 0.1;
        
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectionPosition = projectionMatrix * viewPosition;

            gl_Position = projectionPosition;
            gl_PointSize = uSize * aScale * uPixelRatio;
            gl_PointSize *= (1.0 / - viewPosition.z);

            vScale = aScale;
        }
        `,
        `
        uniform vec3 uColor;
        uniform float uIntensity;

        varying float vScale;

        void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));

            if (distanceToCenter > 0.475) {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
                return;
            }
            float strengh = 0.05 / distanceToCenter - 0.1;
            strengh = clamp(strengh, 0.0, 1.0);
            gl_FragColor = vec4(uColor, strengh) * uIntensity * vScale;
        }
        `
    )
    
    useFrame(({clock}) => {
        ref.current.uniforms.uSize.value = controls.uSize;
        ref.current.uniforms.uTime.value = clock.elapsedTime;
        ref.current.uniforms.uVelocity.value = controls.velocity;
        ref.current.uniforms.uColor.value = new THREE.Color(controls.color);
        ref.current.uniforms.uIntensity.value = controls.intensity;
    })

    extend({ FirefliesShaderMaterial });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={totalFirefliesCount}
                    array={positionsArray}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aScale"
                    count={totalFirefliesCount}
                    array={scalesArray}
                    itemSize={1}
                />
            </bufferGeometry>
            <firefliesShaderMaterial
            ref={ref}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            />
        </points>

    );
};

export default FireFlies;