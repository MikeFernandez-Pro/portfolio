import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';
import {
  max,
  min,
  mix,
  smoothstep,
  texture,
  uniform,
  uv,
  vec4,
} from 'three/tsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import {
  forgeLavaLightSettings,
  forgeLavaLightUniforms,
} from '#islands/world/pointLights/islandPointLights.js';

const LAVA_DEFAULTS = {
  posX: -7.59,
  posY: 1.39,
  posZ: -14.13,
  rotationY: -0.74,
  scaleX: 0.9,
  scaleY: 0.7,
  size: 1.75,
  speed: 0.06,
  crustColor: '#290d07',
  glowColor: '#f47053',
  // Glow intensity range: min at rest, max when the bellows fully close
  minIntensity: 10,
  maxIntensity: 40,
  borderThicknessX: 0.05,
  borderThicknessY: 0.09,
  perlinNoiseStrength: 0.22,
};

/**
 * Standalone lava plane replacing the GLB lava mesh (island_6, hidden).
 * Flat by default (rotated -90° on X), spun around Y via its debug control.
 */
const ForgeLavaPlane = ({ blowerMesh }) => {
  const uniformsRef = useRef(null);
  const gaspParamsRef = useRef({
    base: LAVA_DEFAULTS.minIntensity,
    peak: LAVA_DEFAULTS.maxIntensity,
  });

  // Gasp: uIntensity is driven each frame by the blowerClosed morph weight
  // (animated by the 'details' clip on the island mixer), so the glow can
  // never drift out of sync with the bellows
  const blowerIndex = blowerMesh?.morphTargetDictionary?.blowerClosed;

  // Voronoi (R) and perlin (G) share one packed texture; both sampler
  // uniforms point at it
  const noiseTexture = useVoronoiPerlinTexture();

  const lavaMaterial = useMemo(() => {
    const uniforms = {
      uTime: uniform(0),
      uSize: uniform(LAVA_DEFAULTS.size),
      uSpeed: uniform(LAVA_DEFAULTS.speed),
      uCrustColor: uniform(new THREE.Color(LAVA_DEFAULTS.crustColor)),
      uGlowColor: uniform(new THREE.Color(LAVA_DEFAULTS.glowColor)),
      uIntensity: uniform(LAVA_DEFAULTS.minIntensity),
      uBorderThicknessX: uniform(LAVA_DEFAULTS.borderThicknessX),
      uBorderThicknessY: uniform(LAVA_DEFAULTS.borderThicknessY),
      uPerlinNoiseStrength: uniform(LAVA_DEFAULTS.perlinNoiseStrength),
    };

    const material = new THREE.MeshStandardNodeMaterial();

    // Voronoi (R) and perlin (G) share one packed texture: the perlin
    // scrolls and warps the voronoi crust
    const t = uniforms.uTime.mul(uniforms.uSpeed);
    const lavaUv = uv().mul(uniforms.uSize);
    const perlin = texture(noiseTexture, lavaUv.add(t)).g.mul(
      uniforms.uPerlinNoiseStrength
    );
    const lavaPattern = texture(noiseTexture, lavaUv.add(perlin)).r;
    const lava = mix(uniforms.uCrustColor, uniforms.uGlowColor, lavaPattern);

    // Square border along the plane edges, slightly feathered
    const edgeDist = min(uv(), uv().oneMinus());
    const borderX = smoothstep(
      uniforms.uBorderThicknessX,
      uniforms.uBorderThicknessX.add(0.005),
      edgeDist.x
    ).oneMinus();
    const borderY = smoothstep(
      uniforms.uBorderThicknessY,
      uniforms.uBorderThicknessY.add(0.005),
      edgeDist.y
    ).oneMinus();
    const lavaColor = mix(lava, uniforms.uGlowColor, max(borderX, borderY));

    material.colorNode = vec4(lavaColor, 1);
    material.emissiveNode = lavaColor.mul(uniforms.uIntensity);

    uniformsRef.current = uniforms;

    return material;
  }, [noiseTexture]);

  useEffect(() => () => lavaMaterial.dispose(), [lavaMaterial]);

  const { posX, posY, posZ, rotationY, scaleX, scaleY } = useControls(
    'ForgeLava',
    {
      posX: {
        value: LAVA_DEFAULTS.posX,
        min: Math.floor(LAVA_DEFAULTS.posX),
        max: Math.ceil(LAVA_DEFAULTS.posX),
        step: 0.01,
      },
      posY: {
        value: LAVA_DEFAULTS.posY,
        min: Math.floor(LAVA_DEFAULTS.posY),
        max: Math.ceil(LAVA_DEFAULTS.posY),
        step: 0.01,
      },
      posZ: {
        value: LAVA_DEFAULTS.posZ,
        min: Math.floor(LAVA_DEFAULTS.posZ),
        max: Math.ceil(LAVA_DEFAULTS.posZ),
        step: 0.01,
      },
      rotationY: {
        value: LAVA_DEFAULTS.rotationY,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      },
      scaleX: {
        value: LAVA_DEFAULTS.scaleX,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
      scaleY: {
        value: LAVA_DEFAULTS.scaleY,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
      size: {
        value: LAVA_DEFAULTS.size,
        min: 0.01,
        max: 10,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uSize.value = value;
        },
      },
      speed: {
        value: LAVA_DEFAULTS.speed,
        min: 0,
        max: 2,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uSpeed.value = value;
        },
      },
      crustColor: {
        value: LAVA_DEFAULTS.crustColor,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uCrustColor.value.set(value);
        },
      },
      glowColor: {
        value: LAVA_DEFAULTS.glowColor,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uGlowColor.value.set(value);
        },
      },
      // Resting glow intensity (bellows open)
      minIntensity: {
        value: LAVA_DEFAULTS.minIntensity,
        min: 0,
        max: 30,
        step: 0.01,
        onChange: value => {
          gaspParamsRef.current.base = value;
        },
      },
      // Gasp peak intensity (bellows fully closed)
      maxIntensity: {
        value: LAVA_DEFAULTS.maxIntensity,
        min: 0,
        max: 60,
        step: 0.01,
        onChange: value => {
          gaspParamsRef.current.peak = value;
        },
      },
      borderThicknessX: {
        value: LAVA_DEFAULTS.borderThicknessX,
        min: 0,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uBorderThicknessX.value = value;
        },
      },
      borderThicknessY: {
        value: LAVA_DEFAULTS.borderThicknessY,
        min: 0,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uBorderThicknessY.value = value;
        },
      },
      perlinNoiseStrength: {
        value: LAVA_DEFAULTS.perlinNoiseStrength,
        min: 0,
        max: 5,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uPerlinNoiseStrength.value = value;
        },
      },
    }
  );

  useFrame((_, delta) => {
    if (!uniformsRef.current) return;

    uniformsRef.current.uTime.value += delta;

    const influences = blowerMesh?.morphTargetInfluences;
    const gasp =
      influences && blowerIndex !== undefined ? influences[blowerIndex] : 0;

    const { base, peak } = gaspParamsRef.current;
    uniformsRef.current.uIntensity.value = base + (peak - base) * gasp;

    // The fake point light gasps along the same bellows factor, sweeping
    // its own min/max intensity range
    const { minIntensity, maxIntensity } = forgeLavaLightSettings;
    forgeLavaLightUniforms.uForgeLavaLightIntensity.value =
      minIntensity + (maxIntensity - minIntensity) * gasp;
  });

  return (
    <group
      position={[posX, posY, posZ]}
      rotation-y={rotationY}
      scale={[scaleX, 1, scaleY]}
    >
      <mesh rotation-x={-Math.PI / 2} material={lavaMaterial}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};

export { ForgeLavaPlane };
