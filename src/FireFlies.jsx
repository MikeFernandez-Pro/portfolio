import { useRef, useMemo } from "react";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

import firefliesVertexShader from "./shaders/fireflies/vertex.glsl";
import firefliesFragmentShader from "./shaders/fireflies/fragment.glsl";

const FIREFLIES_POSITIONS = [
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
    [-10.5, 6.35, -35.6],
    [-10.5, 8.45, -41.9],
    [-9.15, 8.45, -41.9],
];

const FIREFLIES_PER_LAMP = 20;
const TOTAL_FIREFLIES_COUNT = FIREFLIES_POSITIONS.length * FIREFLIES_PER_LAMP;

const POSITIONS_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT * 3);
const SCALES_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT);

let currrentLampCount = 1;
for (let i = 0; i < TOTAL_FIREFLIES_COUNT; i++) {
    if (i > (TOTAL_FIREFLIES_COUNT / FIREFLIES_POSITIONS.length) * currrentLampCount) {
        currrentLampCount++;
    }

    POSITIONS_ARRAY[i * 3 + 0] =
        (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][0];
    POSITIONS_ARRAY[i * 3 + 1] =
        (Math.random() - 0.5) * 0.3 + FIREFLIES_POSITIONS[currrentLampCount - 1][1];
    POSITIONS_ARRAY[i * 3 + 2] =
        (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][2];
    SCALES_ARRAY[i] = Math.random() * 0.5 + 0.5;
}

const FireFlies = () => {
    const pixelRatio = useThree((state) => state.gl).getPixelRatio();

    const firefliesRef = useRef();

    const FirefliesShaderMaterial = useMemo(
        () =>
            shaderMaterial(
                {
                    uPixelRatio: pixelRatio,
                    uSize: 30,
                    uTime: 0,
                    uVelocity: 0.17,
                    uColor: new THREE.Color("#ffcaaf"),
                    uIntensity: 8,
                },
                firefliesVertexShader,
                firefliesFragmentShader
            ),
        [pixelRatio]
    );

    extend({ FirefliesShaderMaterial });

    useFrame(({ clock }) => {
        firefliesRef.current.uniforms.uTime.value = clock.elapsedTime;
    });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={TOTAL_FIREFLIES_COUNT}
                    array={POSITIONS_ARRAY}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aScale"
                    count={TOTAL_FIREFLIES_COUNT}
                    array={SCALES_ARRAY}
                    itemSize={1}
                />
            </bufferGeometry>
            <firefliesShaderMaterial
                ref={firefliesRef}
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
};

export default FireFlies;
