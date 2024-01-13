import { useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { useGLTF } from '@react-three/drei';
import { useControls } from 'leva';
import { useStore } from './ZustandStorage';
import grassVertexShader from './shaders/grass/vertex.glsl';
import grassFragmentShader from '/shaders/grass/fragment.glsl';
import { useFrame } from '@react-three/fiber';

let intersects;

const SampledGrass = () => {
  const grassRef = useRef(null);

  const isMobile = useStore(state => state.isMobile);
  const disableSounds = useStore(state => state.disableSounds);

  // Load grass ground model for sampling
  const { nodes } = useMemo(() => useGLTF('/models/island/grassFloor.glb'), [])

  // Define grass blade count and shape
  const { bladeCount, bladeHeight, bladeWidth } = useControls('grass', {
    bladeCount: {
      value: 27000,
      min: 0,
      max: 50000,
      step: 100,
    },
    bladeHeight: {
      value: 0.31,
      min: 0,
      max: 4,
      step: 0.001,
    },
    bladeWidth: {
      value: 0.14,
      min: 0,
      max: 3,
      step: 0.001,
    },
  });

  // const bladeHeight = 0.31;
  // const bladeWidth = 0.14;

  // Create a sampler based on the grass ground model
  const sampler = useMemo(() => new MeshSurfaceSampler(nodes.grassGround).build(), []);

  const defaultPosition = useMemo(() => new THREE.Vector3(), []);

  // Create blades vertex shape and floor positions buffers
  const bufferAttributes = useMemo(() => {
    const bladesShape = new Float32Array([
      bladeWidth / 2, 0, 0,
      -bladeWidth / 2, 0, 0,
      0, bladeHeight, 0
    ])
    const floorPosition = new Float32Array(bladeCount * 3);

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
    }
  }, [])

  // Grass Shader Material Configuration
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCharacter: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: grassVertexShader,
    fragmentShader: grassFragmentShader,
    side: THREE.DoubleSide
  }), []);


  // Create a Raycaster to interact with the grass floor
  let raycaster = useMemo(() => new THREE.Raycaster(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(0, -1, 0), []);




  useLayoutEffect(() => {

    // Grass sound effect Configuration
    const grassSoundEffect = (() => {
      if (disableSounds !== false) return undefined;
      const audio = new Audio("/sounds/runningInGrassSoundEffect.mp3");
      audio.loop = true;
      audio.volume = 0.2;
      return audio;
    })();

    // Subscribe to characterPosition zustand store state
    const unsubCharacterPosition = useStore.subscribe(
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
            grassRef.current.material.uniforms.uCharacter.value = intersects[0].point;
            if (isCharacterMoving && disableSounds === false) {
              grassSoundEffect.play();
            }
            else if (disableSounds === false) {
              grassSoundEffect.pause();
              grassSoundEffect.currentTime = 0;
            }
          }
          else if (disableSounds === false) {
            grassSoundEffect.pause();
            grassSoundEffect.currentTime = 0;
          }
        }
      }
    )

    // Clear subscriptions on unmount
    return () => {
      unsubCharacterPosition()
    }
  }, [bladeCount, bladeHeight, bladeWidth, disableSounds])

  // Update grass shader material uniform that handle blades movement
  useFrame(({ clock }) => {
    if (grassRef.current)
      grassRef.current.material.uniforms.uTime.value = clock.elapsedTime;
  })

  return (
    <>
      <mesh ref={grassRef} frustumCulled={false} material={material}>
        <instancedBufferGeometry instanceCount={bladeCount}>
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

export default SampledGrass;
