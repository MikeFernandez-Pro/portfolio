import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useControls } from "leva";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

import perlinNoiseImage from "/textures/perlin.png";

import wellVertexShader from "../../shaders/well/vertex.glsl";
import wellFragmentShader from "../../shaders/well/fragment.glsl";

const isDebugActive = window.location.hash === "#debug";

const Well = (props) => {
  const { island } = props;

  const well = island.scene.children[0].children[0].children[6];

  if (isDebugActive) {
    useControls("Well", {
      foamColor: {
        value: "#61ade4",
        onChange: (value) => {
          if (well.material.uniforms) {
            well.material.uniforms.uFoamColor.value = new THREE.Color(value);
          }
        },
      },
      waterColor: {
        value: "#5e7b8f",
        onChange: (value) => {
          if (well.material.uniforms) {
            well.material.uniforms.uWaterColor.value = new THREE.Color(value);
          }
        },
      },
    });
  }

  const perlinNoiseTexture = useTexture(perlinNoiseImage, (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  const wellShaderMaterial = useMemo(
    () =>
      new CustomShaderMaterial({
        baseMaterial: THREE.MeshStandardMaterial,
        vertexShader: wellVertexShader,
        fragmentShader: wellFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPerlinNoise: { value: perlinNoiseTexture },
          uWaterColor: { value: new THREE.Color("#5e7b8f") },
          uFoamColor: { value: new THREE.Color("#61ade4") },
        },
        transparent: true,
        silent: true,
      }),
    []
  );

  useEffect(() => {
    well.material = wellShaderMaterial;
  }, [well, wellShaderMaterial]);

  useFrame(({ clock }) => {
    well.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return null;
};

export { Well };
