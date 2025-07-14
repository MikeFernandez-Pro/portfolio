import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { Butterfly } from "./Butterfly";
import grassFragmentShader from "../shaders/grass/fragment.glsl";
import grassVertexShader from "../shaders/grass/vertex.glsl";
import grassHeightTextureAsset from "./textures/grassHeightMap.png";
import { useThree } from "@react-three/fiber";

const Grass = () => {
  const grassRef = useRef<THREE.Mesh>(null);

  // Controls
  const controls = useControls("Grass", {
    colorBase: "#44a33f",
    colorTop: "#4cf288",
    count: { value: 16 * 1000, min: 0, max: 16 * 1000, step: 1 },
    segmentsCount: { value: 3, min: 1, max: 10, step: 1 },
    patchSize: { value: 12.05, min: 0, max: 13, step: 0.01 },
    width: { value: 0.08, min: 0, max: 0.2, step: 0.001 },
    height: { value: 0.36, min: 0, max: 1, step: 0.001 },
    squared: false,
    position: { value: [-8.61, 6.83, -53.03], step: 0.01 },
  });

  const windControls = useControls("Wind", {
    scale: { value: 0.25, min: -2, max: 2, step: 0.01 },
    strength: { value: 1.0, min: -5, max: 5, step: 0.01 },
    speed: { value: 0.7, min: 0, max: 5, step: 0.01 },
  });

  // Geometry
  const grassGeometry = useMemo(() => {
    const vertexNumber = (controls.segmentsCount + 1) * 2;
    const indices = [];

    for (let i = 0; i < controls.segmentsCount; ++i) {
      const vi = i * 2;
      indices[i * 12] = vi;
      indices[i * 12 + 1] = vi + 1;
      indices[i * 12 + 2] = vi + 2;

      indices[i * 12 + 3] = vi + 2;
      indices[i * 12 + 4] = vi + 1;
      indices[i * 12 + 5] = vi + 3;

      const fi = vertexNumber + vi;
      indices[i * 12 + 6] = fi + 2;
      indices[i * 12 + 7] = fi + 1;
      indices[i * 12 + 8] = fi;

      indices[i * 12 + 9] = fi + 3;
      indices[i * 12 + 10] = fi + 1;
      indices[i * 12 + 11] = fi + 2;
    }

    const grassGeometry = new THREE.InstancedBufferGeometry();
    grassGeometry.instanceCount = controls.count;
    grassGeometry.setIndex(indices);
    grassGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      1 + controls.patchSize * 2
    );

    return grassGeometry;
  }, [controls.segmentsCount, controls.patchSize, controls.count]);

  // Materials
  const grassHeightTexture = useTexture(grassHeightTextureAsset, (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
  });

  const grassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uGrassParameters: {
            value: new THREE.Vector4(
              controls.segmentsCount,
              controls.patchSize,
              controls.width,
              controls.height
            ),
          },
          uGrassBaseColor: { value: new THREE.Color(controls.colorBase) },
          uGrassTopColor: { value: new THREE.Color(controls.colorTop) },
          uHeightDataTexture: { value: grassHeightTexture },
          uSquareShape: { value: controls.squared },
          uPositionX: { value: 0 },
          uPositionZ: { value: 0 },

          uWindScale: { value: windControls.scale },
          uWindStrength: { value: windControls.strength },
          uWindSpeed: { value: windControls.speed },
        },
        vertexShader: grassVertexShader,
        fragmentShader: grassFragmentShader,
        side: THREE.FrontSide,
      }),
    [controls, windControls, grassHeightTexture]
  );

  // Update material uniforms from Leva controls - Can remove when controls are removed
  useEffect(() => {
    grassMaterial.uniforms.uGrassBaseColor.value = new THREE.Color(
      controls.colorBase
    );
    grassMaterial.uniforms.uGrassTopColor.value = new THREE.Color(
      controls.colorTop
    );
    grassMaterial.uniforms.uHeightDataTexture.value = grassHeightTexture;
    grassMaterial.uniforms.uGrassParameters.value.x = controls.segmentsCount;
    grassMaterial.uniforms.uGrassParameters.value.y = controls.patchSize;
    grassMaterial.uniforms.uGrassParameters.value.z = controls.width;
    grassMaterial.uniforms.uGrassParameters.value.w = controls.height;
    grassMaterial.uniforms.uSquareShape.value = controls.squared;
    grassMaterial.uniforms.uWindScale.value = windControls.scale;
    grassMaterial.uniforms.uWindStrength.value = windControls.strength;
    grassMaterial.uniforms.uWindSpeed.value = windControls.speed;
    grassMaterial.uniforms.uPositionX.value = controls.position[0];
    grassMaterial.uniforms.uPositionZ.value = controls.position[2];
  }, [controls, windControls, grassHeightTexture, grassMaterial]);

  // Update time for grass
  useFrame(({ clock }) => {
    grassMaterial.uniforms.uTime.value = clock.elapsedTime;
    if (grassRef.current) {
      grassRef.current.position.set(
        controls.position[0],
        controls.position[1],
        controls.position[2]
      );
    }
  });

  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);

    scene.add(grass);
    grassRef.current = grass;

    return () => {
      scene.remove(grass);
    };
  }, [grassGeometry, grassMaterial, scene, controls.count]);

  return (
    <>
      {/* <GrassSparkles scale={controls.patchSize} />
    

      <Butterfly position={[3, 0.5, 3]} scale={0.2} color="#ffffff" /> */}
    </>
  );
};

export { Grass };

useTexture.preload(grassHeightTextureAsset);
