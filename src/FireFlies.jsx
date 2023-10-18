import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef } from 'react';
import * as THREE from 'three';

const FireFlies = (props) => {

    const firefliesGeometry = new THREE.BufferGeometry();
    const firefliesCount = 30;
    const positionsArray = new Float32Array(firefliesCount * 3);
    const scalesArray = new Float32Array(firefliesCount);

    for (let i = 0; i < firefliesCount * 3; i++) {
        positionsArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
        positionsArray[i * 3 + 1] = Math.random() * 1.5;
        positionsArray[i * 3 + 2] = (Math.random() - 0.5) * 4;

        scalesArray[i] = Math.random();
    }

    const {gl} = useThree();

    const ref = useRef();

    const controls = useControls("FireFlies", {
        uSize: { value: 100, min: 0, max: 1000, step: 1 },
    });

    const FirefliesShaderMaterial = shaderMaterial(
        {
            uPixelRatio: Math.min(gl.getPixelRatio(), 2),
            uSize: controls.uSize,
            uTime: 0,
        },
        `
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uTime;

        attribute float aScale;
        
        void main() {
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            modelPosition.y += sin(modelPosition.x * 10.0 + uTime) * aScale * 0.2;
        
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectionPosition = projectionMatrix * viewPosition;

            gl_Position = projectionPosition;
            gl_PointSize = uSize * aScale * uPixelRatio;
            gl_PointSize *= (1.0 / - viewPosition.z);
        }
        `,
        `
        void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));

            if (distanceToCenter > 0.475)
                discard;
            float strengh = 0.05 / distanceToCenter - 0.1;
            gl_FragColor = vec4(1.0, 1.0, 1.0, strengh);
        }
        `
    )
    
    useFrame(({clock}) => {
        ref.current.uniforms.uSize.value = controls.uSize;
        ref.current.uniforms.uTime.value = clock.elapsedTime;
    })

    extend({ FirefliesShaderMaterial });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={firefliesCount}
                    array={positionsArray}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aScale"
                    count={firefliesCount}
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