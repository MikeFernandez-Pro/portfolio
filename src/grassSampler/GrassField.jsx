import * as THREE from 'three';
import createGrassMaterial from './GrassMaterial';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { useControls } from 'leva';

const GrassField = ({mesh}) => {


  const { bladeCount, bladeHeight,bladeWidth  } = useControls('grass', {
    bladeCount: {
      value: 50000,
      min: 0,
      max: 500000,
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

  const sampler = new MeshSurfaceSampler(mesh).build()


  const grassRef = useRef();

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
  }, [bladeCount, bladeHeight, bladeWidth, sampler])


  const material = createGrassMaterial();

  useFrame(({ clock }) => {
    grassRef.current.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (<>
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
  )
}

export default GrassField;
