import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import * as THREE from 'three';

import countryFlagVertexShader from '#shaders/countryFlag/vertex.glsl';

// Grade shared by the three flags, driven by the 'Flags' debug folder in
// CountriesFlags
const flagsGradeUniforms = {
  uFlagLightness: { value: 1 },
  uFlagSaturation: { value: 1 },
};

const CountryFlag = props => {
  const { node, baseMaterial } = props;

  const countryFlagShaderMaterial = useMemo(() => {
    // The GLB flag materials are unlit; rebuild a MeshStandardMaterial from
    // their map/color so the flags react to the scene lights (this also
    // keeps the shared GLB material pristine — CSM patches its base in
    // place, StrictMode/HMR safe)
    const material = new CustomShaderMaterial({
      baseMaterial: new THREE.MeshStandardMaterial({
        map: baseMaterial.map ?? null,
        color: baseMaterial.color.clone(),
        roughness: 1,
        metalness: 0,
        side: baseMaterial.side,
      }),
      vertexShader: countryFlagVertexShader,
      uniforms: {
        uTime: { value: 0.0 },
      },
    });

    // Lightness/saturation grade chained after CSM's own patch and injected
    // after <map_fragment>, so it affects the flag texture too (CSM's
    // csm_DiffuseColor hook runs before the map is sampled)
    const previousOnBeforeCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile?.call(material, shader, renderer);

      Object.assign(shader.uniforms, flagsGradeUniforms);

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uFlagLightness;
uniform float uFlagSaturation;`
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
diffuseColor.rgb *= uFlagLightness;
float flagLuminance = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb = mix(vec3(flagLuminance), diffuseColor.rgb, uFlagSaturation);`
        );
    };

    return material;
  }, [baseMaterial]);

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

export { CountryFlag, flagsGradeUniforms };
