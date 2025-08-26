import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import countryFlagVertexShader from '#shaders/countryFlag/vertex.glsl';

const CountryFlag = props => {
  const { flag } = props;

  useEffect(() => {
    const countryFlagShaderMaterial = new CustomShaderMaterial({
      baseMaterial: flag.material,
      vertexShader: countryFlagVertexShader,
      uniforms: {
        uTime: { value: 0.0 },
      },
    });

    flag.material?.dispose();
    flag.material = countryFlagShaderMaterial;
  }, [flag]);

  useFrame(({ clock }) => {
    if (
      flag.material &&
      flag.material.uniforms &&
      flag.material.uniforms.uTime
    ) {
      flag.material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return null;
};

export { CountryFlag };
