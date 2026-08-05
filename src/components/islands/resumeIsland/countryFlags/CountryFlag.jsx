import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import countryFlagVertexShader from '#shaders/countryFlag/vertex.glsl';

const CountryFlag = props => {
  const { node, baseMaterial } = props;

  const countryFlagShaderMaterial = useMemo(
    () =>
      // CSM patches the base material instance in place, so clone the shared
      // GLB material to keep the original pristine (StrictMode/HMR safe)
      new CustomShaderMaterial({
        baseMaterial: baseMaterial.clone(),
        vertexShader: countryFlagVertexShader,
        uniforms: {
          uTime: { value: 0.0 },
        },
      }),
    [baseMaterial]
  );

  useFrame(({ clock }) => {
    countryFlagShaderMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <skinnedMesh
      name={node.name}
      geometry={node.geometry}
      material={countryFlagShaderMaterial}
      skeleton={node.skeleton}
      morphTargetDictionary={node.morphTargetDictionary}
      morphTargetInfluences={node.morphTargetInfluences}
    />
  );
};

export { CountryFlag };
