import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  attribute,
  clamp,
  max,
  materialOpacity,
  mix,
  uniform,
  varying,
  vec3,
  vec4,
} from 'three/tsl';

import { dissolveLava } from '#shaders/dissolve.js';
import { patchIslandPointLights } from '#islands/world/pointLights/islandPointLights.js';
import { patchCloudShadows } from '#shaders/cloudShadows.js';
import { useStore } from '#store';
import { useControls } from '#debug/useControls.jsx';

// Lantern geometry bounds (origin at the top attachment loop)
const BOUNDS_MIN = new THREE.Vector3(-0.39, -1.07, -0.39);
const BOUNDS_MAX = new THREE.Vector3(0.39, 0.08, 0.39);

// The lantern vertex colors are part markers (black / white / red), each
// part gets its own display color; the white part also glows
const COLOR_DEFAULTS = {
  blackColor: '#4e4e4e',
  whiteColor: '#91ffd0',
  whiteIntensity: 3.6,
  redColor: '#353535',
  roughness: 0.55,
  metalness: 0.35,
};

// The lantern glb ships without a material. Build one mirroring the knight
// (dissolve + cloud shadow / island point light patches) on the knight's
// dissolve uniform nodes: the respawn timeline tweens those, so the lantern
// dissolves/reforms in sync with the character for free.
const useLanternMaterial = (characterScene, lanternMeshRef) => {
  const materialRef = useRef(null);
  const colorUniformsRef = useRef(null);

  useEffect(() => {
    const lanternMesh = lanternMeshRef.current;
    // Set up by useCharacterMaterial, which runs first (hook call order)
    const shared = useStore.getState().characterRespawnUniforms;

    if (!lanternMesh || !shared) {
      return;
    }

    const colors = {
      uBlackColor: uniform(new THREE.Color(COLOR_DEFAULTS.blackColor)),
      uWhiteColor: uniform(new THREE.Color(COLOR_DEFAULTS.whiteColor)),
      uWhiteIntensity: uniform(COLOR_DEFAULTS.whiteIntensity),
      uRedColor: uniform(new THREE.Color(COLOR_DEFAULTS.redColor)),
    };

    const material = new THREE.MeshStandardNodeMaterial({
      roughness: COLOR_DEFAULTS.roughness,
      metalness: COLOR_DEFAULTS.metalness,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    // Vertex colors mark the lantern parts, they are not display colors:
    // read COLOR_0 directly (vertexColors stays off so it doesn't tint).
    // Centroid: with MSAA the pixel center can sit outside a small triangle
    // and extrapolate vertex colors past 0–1, which blows up the unlit mix
    const partMask = varying(attribute('color', 'vec4').rgb, 'vPartMask');
    partMask.setInterpolation(
      THREE.InterpolationSamplingType.PERSPECTIVE,
      THREE.InterpolationSamplingMode.CENTROID
    );
    // clamp: MSAA can still nudge centroid samples slightly out of 0–1
    const whiteMask = clamp(partMask.g, 0, 1);

    const lava = dissolveLava(shared, uniform(BOUNDS_MIN), uniform(BOUNDS_MAX));

    material.colorNode = Fn(() => {
      // Only white carries green, red carries red without green, black
      // neither. Normalized so interpolated pixels on part borders still
      // blend to 1
      const redMaskRaw = clamp(partMask.r, 0, 1);
      const redMask = redMaskRaw.mul(whiteMask.oneMinus());
      const blackMask = max(redMaskRaw, whiteMask).oneMinus();
      const maskSum = max(blackMask.add(whiteMask).add(redMask), 1e-4);
      const partColor = colors.uBlackColor
        .mul(blackMask)
        .add(colors.uWhiteColor.mul(whiteMask))
        .add(colors.uRedColor.mul(redMask))
        .div(maskSum);

      const color = mix(
        lava,
        vec4(partColor, 1),
        shared.uCharFormProgress
      ).toVar();
      If(color.a.mul(materialOpacity).lessThan(shared.uAlphaClip), () => {
        Discard();
      });
      return color;
    })();

    patchCloudShadows(material);
    patchIslandPointLights(material);

    // The white-marked part is unlit, like the head orb: constant color *
    // intensity, immune to lights and cloud shadows. Applied over the final
    // output, after every other patch; only the respawn dissolve still fades
    // it (uCharFormProgress gate)
    const litOutput = material.outputNode;
    material.outputNode = vec4(
      mix(
        litOutput.rgb,
        vec3(colors.uWhiteColor.mul(colors.uWhiteIntensity)),
        whiteMask.mul(shared.uCharFormProgress)
      ),
      litOutput.a
    );

    lanternMesh.material = material;
    materialRef.current = material;
    colorUniformsRef.current = colors;

    return () => {
      materialRef.current = null;
      colorUniformsRef.current = null;
      material.dispose();
    };
  }, [characterScene]);

  useControls('LanternColors', {
    blackColor: {
      value: COLOR_DEFAULTS.blackColor,
      onChange: v => colorUniformsRef.current?.uBlackColor.value.set(v),
    },
    whiteColor: {
      value: COLOR_DEFAULTS.whiteColor,
      onChange: v => colorUniformsRef.current?.uWhiteColor.value.set(v),
    },
    whiteIntensity: {
      value: COLOR_DEFAULTS.whiteIntensity,
      min: 0,
      max: 10,
      step: 0.05,
      onChange: v => {
        if (colorUniformsRef.current)
          colorUniformsRef.current.uWhiteIntensity.value = v;
      },
    },
    redColor: {
      value: COLOR_DEFAULTS.redColor,
      onChange: v => colorUniformsRef.current?.uRedColor.value.set(v),
    },
    roughness: {
      value: COLOR_DEFAULTS.roughness,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: v => {
        if (materialRef.current) materialRef.current.roughness = v;
      },
    },
    metalness: {
      value: COLOR_DEFAULTS.metalness,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: v => {
        if (materialRef.current) materialRef.current.metalness = v;
      },
    },
  });
};

export { useLanternMaterial };
