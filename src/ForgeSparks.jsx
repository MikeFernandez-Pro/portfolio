import { forwardRef, useRef } from "react";
import { extend, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

import forgeSparksVertexShader from "./shaders/forgeSparks/vertex.glsl";
import forgeSparksFragmentShader from "./shaders/forgeSparks/fragment.glsl";

const ForgeSparks = forwardRef(({}, ref) => {
    const materialRef = useRef();

    const { size } = useThree();
    const pixelRatio = useThree((state) => state.gl).getPixelRatio();

    const count = 100;
    const radius = 0.5;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const angles = new Float32Array(count);
    const speed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        sizes[i] = Math.random();
        angles[i] = Math.random() * Math.PI * 2;
        speed[i] = Math.random() * 0.5 + 0.5;
    }
    const ForgeSparksMaterial = shaderMaterial(
        {
            uSize: 0.06,
            uResolution: new THREE.Vector2(size.width * pixelRatio, size.height * pixelRatio),
            uProgress: 0,
        },
        forgeSparksVertexShader,
        forgeSparksFragmentShader
    );

    extend({ ForgeSparksMaterial });

    return (
        <points ref={ref} position={[-5.82, 1.75, -10.88]} frustumCulled={false}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aSize"
                    count={count}
                    array={sizes}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aAngle"
                    count={count}
                    array={angles}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aSpeed"
                    count={count}
                    array={speed}
                    itemSize={1}
                />
            </bufferGeometry>
            <forgeSparksMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
});

export default ForgeSparks;
