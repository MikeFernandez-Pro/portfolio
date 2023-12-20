import { useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { useGLTF } from '@react-three/drei';
import { useControls } from 'leva';
import { useStore } from '../ZustandStorage';
import grass_vs from './shader/vertex.glsl';
import grass_fs from './shader/fragment.glsl';
import { useFrame } from '@react-three/fiber';

const Scene = () => {
  const grassRef = useRef(null);

  const { nodes } = useGLTF('/models/finalIsland/grassGroundv2.glb')

  const { bladeCount, bladeHeight, bladeWidth } = useControls('grass', {
    bladeCount: {
      value: 50000,
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

  // const bladeCount = 50000;
  // const bladeHeight = 0.31;
  // const bladeWidth = 0.14;

  const sampler = new MeshSurfaceSampler(nodes.grassGround).build()

  const defaultPosition = new THREE.Vector3();

  const bufferAttributes = useMemo(() => {
    const bladeVertices = new Float32Array([
      bladeWidth / 2, 0, 0,
      -bladeWidth / 2, 0, 0,
      0, bladeHeight, 0
    ])
    const terrainPositions = new Float32Array(bladeCount * 3);

    for (let i = 0; i < bladeCount; i += 3) {
      // Create a random point on the surface of the sampled mesh 
      sampler.sample(defaultPosition);
      terrainPositions[i + 0] = defaultPosition.x;
      terrainPositions[i + 1] = defaultPosition.y;
      terrainPositions[i + 2] = defaultPosition.z;
    }

    return {
      terrainPositions,
      bladeVertices,
    }
  }, [])


  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: grass_vs,
    fragmentShader: grass_fs,
    side: THREE.DoubleSide
  });



  let raycaster = new THREE.Raycaster();
  const rayDirection = new THREE.Vector3(0, -1, 0);
  rayDirection.normalize();

  const rayOrigin = useRef(useStore.getState(state => state.characterPosition))
  const grassSoundEffect = new Audio("/sounds/runningInGrassSound.mp3");
  grassSoundEffect.loop = true;
  grassSoundEffect.volume = 1;
  const grassSoundEffectActivationRef = useRef(false)

  let intersects;

  useLayoutEffect(() => {

    // Subscribe to characterPosition zustand store state
    const unsubCharacterPosition = useStore.subscribe(
      (state) => state.characterPosition,
      (characterPosition) => {
        if (characterPosition) {
          characterPosition.y += 0.5;
          raycaster.set(characterPosition, rayDirection);

          // Test intersection with grass floor
          intersects = raycaster.intersectObjects([nodes.grassGround]);
          if (intersects.length > 0 && grassRef.current) {
            if (grassSoundEffectActivationRef.current === false) {
              grassSoundEffect.play();
              grassSoundEffectActivationRef.current = true;
            }
            grassRef.current.material.uniforms.uMouse.value = intersects[0].point;
          }
          else {
            grassSoundEffect.pause();
            grassSoundEffect.currentTime = 0;
            grassSoundEffectActivationRef.current = false;
          }
        }
      }
    )

    // Clear subscriptions on unmount
    return () => {
      unsubCharacterPosition()
    }
  }, [bladeCount, bladeHeight, bladeWidth])

  useFrame(({ clock }) => {

    if (grassRef.current)
      grassRef.current.material.uniforms.uTime.value = clock.elapsedTime;
  })


  return (
    <>
      {/* <primitive object={nodes.grassGround} /> */}
      <mesh ref={grassRef} frustumCulled={false} material={material}>
        <instancedBufferGeometry instanceCount={bladeCount}>
          <float32BufferAttribute
            attach={"attributes-position"}
            count={bufferAttributes.bladeVertices.length / 3}
            array={bufferAttributes.bladeVertices}
            itemSize={3}
          />
          <instancedBufferAttribute
            attach={"attributes-terrainPosition"}
            count={bufferAttributes.terrainPositions.length / 3}
            array={bufferAttributes.terrainPositions}
            itemSize={3}
          />
        </instancedBufferGeometry>
      </mesh>
    </>
  );
};

export default Scene;
