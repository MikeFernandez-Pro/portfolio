import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

import countryFlagVertexShader from "../shaders/countryFlag/vertex.glsl";
import countryFlagFragmentShader from "../shaders/countryFlag/fragment.glsl";

const CountryFlag = ({ flag }) => {
  const countryFlagBaseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: flag.material.map,
      }),
    [flag.material.map]
  );

  const countryFlagShaderMaterial = useMemo(
    () =>
      new CustomShaderMaterial({
        baseMaterial: countryFlagBaseMaterial,
        vertexShader: countryFlagVertexShader,
        fragmentShader: countryFlagFragmentShader,
        silent: true,
        uniforms: {
          uTime: { value: 0.0 },
        },
      }),
    [countryFlagBaseMaterial]
  );

  useEffect(() => {
    flag.material = countryFlagShaderMaterial;
    flag.frustrumCulled = false;
  }, [flag, countryFlagShaderMaterial]);

  useFrame(({ clock }) => {
    flag.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return null;
};

export { CountryFlag };
