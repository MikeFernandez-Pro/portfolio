import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import countryFlagVertexShader from '#shaders/countryFlag/vertex.glsl';
import countryFlagFragmentShader from '#shaders/countryFlag/fragment.glsl';

const CountryFlag = ({ flag }) => {
  const countryFlagShaderMaterial = useMemo(
    () =>
      new CustomShaderMaterial({
        baseMaterial: flag.material,
        vertexShader: countryFlagVertexShader,
        fragmentShader: countryFlagFragmentShader,
        uniforms: {
          uTime: { value: 0.0 },
        },
      }),
    [flag.material]
  );

  useEffect(() => {
    flag.material?.dispose();
    flag.material = countryFlagShaderMaterial;
    flag.frustrumCulled = false;
  }, [flag, countryFlagShaderMaterial]);

  useFrame(({ clock }) => {
    flag.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return null;
};

export { CountryFlag };
