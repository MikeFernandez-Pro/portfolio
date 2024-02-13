import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { useGLTF } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import grassVertexShader from "./shaders/grass/vertex.glsl";
import grassFragmentShader from "/shaders/grass/fragment.glsl";
import { useFrame } from "@react-three/fiber";
import { Howl } from "howler";

const BLADES_COUNT = 27000;
const BLADES_HEIGHT = 0.31;
const BLADES_WIDTH = 0.14;

const MOBILE_DEVICE = "ontouchstart" in window || navigator.maxTouchPoints > 0;

var grassSoundEffect = MOBILE_DEVICE
    ? undefined
    : new Howl({
          src: ["/sounds/runningInGrassSoundEffect.mp3"],
          autoplay: false,
          loop: true,
          volume: 0.2,
      });

let intersects;
let isAudioPlaying = false;

const SampledGrass = () => {
    const grassRef = useRef(null);

    // Load grass ground model for sampling
    const { nodes } = useMemo(() => useGLTF("/models/island/grassFloorSampler.glb"), []);

    // Create a sampler based on the grass ground model
    const sampler = useMemo(() => new MeshSurfaceSampler(nodes.grassGround).build(), []);

    const defaultPosition = useMemo(() => new THREE.Vector3(), []);

    // Create blades vertex shape and floor positions buffers
    const bufferAttributes = useMemo(() => {
        const bladesShape = new Float32Array([
            BLADES_WIDTH / 2,
            0,
            0,
            -BLADES_WIDTH / 2,
            0,
            0,
            0,
            BLADES_HEIGHT,
            0,
        ]);
        const floorPosition = new Float32Array(BLADES_COUNT * 3);

        for (let i = 0; i < floorPosition.length; i += 3) {
            // Create a random point on the surface of the sampled floor
            sampler.sample(defaultPosition);
            floorPosition[i + 0] = defaultPosition.x;
            floorPosition[i + 1] = defaultPosition.y;
            floorPosition[i + 2] = defaultPosition.z;
        }

        return {
            floorPosition,
            bladesShape,
        };
    }, []);

    // Grass Shader Material Configuration
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uCharacter: { value: new THREE.Vector3(0, 0, 0) },
                },
                vertexShader: grassVertexShader,
                fragmentShader: grassFragmentShader,
                side: THREE.DoubleSide,
            }),
        []
    );

    // Create a Raycaster to interact with the grass floor
    let raycaster = useMemo(() => new THREE.Raycaster(), []);
    const rayDirection = useMemo(() => new THREE.Vector3(0, -1, 0), []);

    useLayoutEffect(() => {
        // Subscribe to characterPosition zustand store state
        const unsubCharacterPosition = MOBILE_DEVICE
            ? undefined
            : useStore.subscribe(
                  (state) => [state.characterPosition, state.isCharacterMoving],
                  ([characterPosition, isCharacterMoving]) => {
                      if (characterPosition) {
                          // Set the raycaster to the character position with de default rayDirection
                          characterPosition.y += 0.5;
                          raycaster.set(characterPosition, rayDirection);

                          // Test intersection with grass floor, update blades verteces position
                          // depending on the intersection point and play / pause sound effect
                          intersects = raycaster.intersectObjects([nodes.grassGround]);
                          if (intersects.length > 0 && grassRef.current) {
                              grassRef.current.material.uniforms.uCharacter.value =
                                  intersects[0].point;
                              if (isCharacterMoving) {
                                  if (!isAudioPlaying) {
                                      grassSoundEffect.play();
                                      isAudioPlaying = true;
                                  }
                              } else {
                                  isAudioPlaying = false;
                                  grassSoundEffect.stop();
                              }
                          } else {
                              isAudioPlaying = false;
                              grassSoundEffect.stop();
                          }
                      }
                  }
              );

        // Clear subscriptions on unmount
        return () => {
            if (MOBILE_DEVICE) return;
            unsubCharacterPosition();
        };
    }, [BLADES_COUNT, BLADES_HEIGHT, BLADES_WIDTH]);

    // Update grass shader material uniform that handle blades movement
    useFrame(({ clock }) => {
        if (grassRef.current)
            grassRef.current.material.uniforms.uTime.value = clock.elapsedTime;
    });

    return (
        <>
            <mesh ref={grassRef} frustumCulled={false} material={material}>
                <instancedBufferGeometry instanceCount={BLADES_COUNT}>
                    <float32BufferAttribute
                        attach={"attributes-position"}
                        count={bufferAttributes.bladesShape.length / 3}
                        array={bufferAttributes.bladesShape}
                        itemSize={3}
                    />
                    <instancedBufferAttribute
                        attach={"attributes-floorPosition"}
                        count={bufferAttributes.floorPosition.length / 3}
                        array={bufferAttributes.floorPosition}
                        itemSize={3}
                    />
                </instancedBufferGeometry>
            </mesh>
        </>
    );
};

useGLTF.preload("/models/island/grassFloorSampler.glb");

export default SampledGrass;
