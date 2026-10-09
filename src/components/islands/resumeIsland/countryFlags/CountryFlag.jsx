import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
  dot,
  float,
  materialColor,
  mix,
  positionGeometry,
  positionLocal,
  sin,
  time,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

// Grade shared by the three flags, driven by the Flags > Grade debug folder
// in CountriesFlags (TSL uniform nodes: `.value` like the old objects)
const flagsGradeUniforms = {
  uFlagLightness: uniform(1),
  uFlagSaturation: uniform(1),
};

// Per-flag grade on top of the shared one (Flags > British/French/Spain):
// own lightness multiplies the shared lightness, the tint multiplies the
// final color. The schema defaults in CountriesFlags are the production
// source of truth (headless onChange overwrites these on load)
const createFlagOwnUniforms = () => ({
  uFlagOwnLightness: uniform(1),
  uFlagTint: uniform(new THREE.Color('#ffd6d6')),
});
const flagsIndividualUniforms = {
  british: createFlagOwnUniforms(),
  french: createFlagOwnUniforms(),
  spain: createFlagOwnUniforms(),
};

// Reduced motion: frozen time = a fixed billow instead of the flutter
const flagTime = REDUCED_MOTION_AT_LOAD ? float(0) : time;

const CountryFlag = props => {
  const { node, baseMaterial, country } = props;

  const countryFlagMaterial = useMemo(() => {
    // The GLB flag materials are unlit; rebuild a lit material from their
    // map/color so the flags react to the scene lights (this also keeps the
    // shared GLB material pristine)
    const material = new THREE.MeshStandardNodeMaterial({
      map: baseMaterial.map ?? null,
      color: baseMaterial.color.clone(),
      roughness: 1,
      metalness: 0,
      side: baseMaterial.side,
    });

    // Flutter growing away from the pole (x = -6 in flag space). Added to
    // positionLocal, which already carries the skinning/morphs: a
    // positionNode replaces them otherwise. Squared by a multiply: pow() of
    // a negative base is NaN in WGSL
    const fromPole = positionGeometry.x.add(6);
    const flutter = sin(fromPole.mul(5).sub(flagTime.mul(4)))
      .div(fromPole.mul(fromPole))
      .mul(0.5);
    material.positionNode = positionLocal.add(vec3(0, flutter, 0));

    // Lightness / saturation / tint grade, on the flag texture too
    const { uFlagLightness, uFlagSaturation } = flagsGradeUniforms;
    const { uFlagOwnLightness, uFlagTint } = flagsIndividualUniforms[country];
    const lit = materialColor.rgb.mul(uFlagLightness).mul(uFlagOwnLightness);
    const luminance = dot(lit, vec3(0.299, 0.587, 0.114));
    material.colorNode = vec4(
      mix(vec3(luminance), lit, uFlagSaturation).mul(uFlagTint),
      materialColor.a
    );

    return material;
  }, [baseMaterial, country]);

  useEffect(() => () => countryFlagMaterial.dispose(), [countryFlagMaterial]);

  return (
    <skinnedMesh
      name={node.name}
      geometry={node.geometry}
      material={countryFlagMaterial}
      skeleton={node.skeleton}
      morphTargetDictionary={node.morphTargetDictionary}
      morphTargetInfluences={node.morphTargetInfluences}
    />
  );
};

export { CountryFlag, flagsGradeUniforms, flagsIndividualUniforms };
