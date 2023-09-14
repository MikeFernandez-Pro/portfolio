import "./RenderMaterial";
import "./SimulationMaterial";
import { getPixelDataFromImage } from "../utils/getPixelDataFromImage";
import { createPortal } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFBO } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";

import t1 from "/textures/TestVector.jpg";

const Particles = () => {
    // Define particles default positon depending on dataTexture
    const [originalPosition, setOriginalPosition] = useState(null);

    // Create simulation and render materials refs
    const simMat = useRef();
    const renderMat = useRef();


    // Retrieve renderer and viewport objets from three.js context
    const { gl, viewport } = useThree();

    const controls = useControls("FBO", {
        uSize: 7 * gl.getPixelRatio(),
        position: { value: [8, 46, 11], step: 0.1 },
        rotation: { value: [0, 0, 0], step: 0.1 },
    });

    // Define particles random color
    const particlesColors = [
        [0.4, 0.70, 0.95],
        [0.4, 0.90, 0.95],
    ]

    // Define size of particles grid
    const SIZE = 80;

    // Particles buffer attatibutes
    const particles = new Float32Array(SIZE * SIZE * 3);
    const colors = new Float32Array(SIZE * SIZE * 3);
    const uvs = new Float32Array(SIZE * SIZE * 2);
    const scales = new Float32Array(SIZE * SIZE * 2);

    // Initalize particles buffer attributes
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            const k = i * SIZE + j;
            const rand = Math.round(Math.random())
            particles[k * 3 + 0] = i / SIZE;
            particles[k * 3 + 1] = j / SIZE;
            particles[k * 3 + 2] = 0;

            colors[k * 3 + 0] = particlesColors[rand][0];
            colors[k * 3 + 1] = particlesColors[rand][1];
            colors[k * 3 + 2] = particlesColors[rand][2];

            uvs[k * 2 + 0] = i / (SIZE - 1);
            uvs[k * 2 + 1] = j / (SIZE - 1);

            scales[k] = (0.3 + Math.random() * 0.7);
        }
    }

    // Create new scene and camera for simulation
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    // Create render targets for simulation
    let target0 = useFBO(SIZE, SIZE, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
    });
    let target1 = useFBO(SIZE, SIZE, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        type: THREE.FloatType,
    });

    // Real time FBO simulation
    useFrame(({ gl }) => {
        gl.setRenderTarget(target0);
        gl.render(scene, camera);
        gl.setRenderTarget(null);
        renderMat.current.uniforms.uPosition.value = target1.texture;
        simMat.current.uniforms.uPosition.value = target0.texture;
        let temp = target0;
        target0 = target1;
        target1 = temp;
    });

    // Update particles positon depending on mouse position and time
    useFrame(({ mouse, clock }) => {
                
        simMat.current.uniforms.uMouse.value.x = ((mouse.x * viewport.width) / 2) * 0.165;
        simMat.current.uniforms.uMouse.value.y = ((mouse.y * viewport.height) / 2) * 0.165;
        // simMat.current.uniforms.uMouse.value.x = ((mouse.x * viewport.width) / 2);
        // simMat.current.uniforms.uMouse.value.y = ((mouse.y * viewport.height) / 2);
        simMat.current.uniforms.uTime.value = clock.elapsedTime;
        renderMat.current.uniforms.uTime.value = clock.elapsedTime;
        renderMat.current.uniforms.uSize.value = controls.uSize; // A DELETE
    });

    useEffect(() => {
        // Retrieve dataTexture coordinates from image
        getPixelDataFromImage(t1, SIZE, viewport.aspect).then((dataTexture) => {
            setOriginalPosition(dataTexture);
        });

        // Define particles scale according to aspectRatio
        renderMat.current.uniforms.uScaleRatio.value = viewport.aspect;
    }, [viewport.aspect]);

    useFrame((state) => {
        // state.camera.position.copy(controls.cameraPosition);
        // state.camera.lookAt(new THREE.Vector3(controls.position))
    })

    return (
        <>
            {createPortal(
                <mesh>
                    <planeGeometry args={[2, 2]} />
                    <simulationMaterial
                        ref={simMat}
                        uPosition={originalPosition}
                        uOriginalPosition={originalPosition}
                    />
                </mesh>,
                scene
            )}
            <points position={controls.position} rotation={controls.rotation}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particles.length / 3}
                        array={particles}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-aColor"
                        count={colors.length / 3}
                        array={colors}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-aUv"
                        count={uvs.length / 3}
                        array={uvs}
                        itemSize={2}
                    />
                    <bufferAttribute
                        attach="attributes-aScale"
                        count={scales.length / 3}
                        array={scales}
                        itemSize={1}
                    />
                </bufferGeometry>
                <renderMaterial
                    transparent
                    blending={THREE.AdditiveBlending}
                    ref={renderMat}
                    depthWrite={false}
                    vertexColors={true}
                // depthTest={false}
                />
            </points>
        </>
    );
}

export default Particles;