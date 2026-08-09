import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import portalVertexShader from '#shaders/cauldronPortal/vertex.glsl';
import portalFragmentShader from '#shaders/cauldronPortal/fragment.glsl';

import perlinNoiseImage from '#assets/textures/perlin.png';

const SPEED = 0.5;

// Ported from an earlier project's ending portal (its portal settings defaults)
const PORTAL_DEFAULTS = {
  deepColor: '#429852', 
  midColor: '#30e011',
  brightColor: '#35d567',
  opacity: 0.82,
  distortionScale: 1.4,
  distortionStrength: 0.2,
  distortionSpeed: 0.100,
  rotationSpeed: 0.6,
  backgroundStrength: 2,
  backgroundCenterGlow: 1.67,
  backgroundFalloff: 2.96,
  backgroundCloudContrast: 0,
  ribbonStrength: 0.61,
  ribbonCount: 3.5,
  ribbonWidth: 0.185,
  ribbonTwist: -3.99,
  ribbonSpeed: -0.51,
  ribbonBreakup: 0,
  filamentStrength: 0.59,
  filamentCount: 3,
  filamentWidth: 0.06,
  filamentTwist: -10,
  filamentSpeed: 1,
  filamentBreakup: 0.37,
  coreStrength: 0.69,
  coreRadius: 0.1,
  coreSoftness: 0.185,
  coreHalo: 0.33,
  corePulseAmount: 0.109,
  corePulseSpeed: 0.66,
  rimStrength: 0,
  rimRadius: 1.015,
  rimWidth: 0.095,
  rimWobble: 0.127,
  rimSpeed: 0.48,
};

const Cauldron = props => {
  const { island } = props;

  const portalMaterialRef = useRef(null);

  const perlinNoiseTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  // The potion mesh has no UVs: the vertex shader maps the portal onto the
  // liquid disc from its local-space XZ bounds instead
  const portalBounds = useMemo(() => {
    const geometry = island.nodes.island_8.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;

    return {
      center: new THREE.Vector2((min.x + max.x) / 2, (min.z + max.z) / 2),
      halfSize: new THREE.Vector2((max.x - min.x) / 2, (max.z - min.z) / 2),
    };
  }, [island]);

  // Stable identity: CSM resets every uniform to these values whenever the
  // uniforms prop changes reference, which would wipe the debug tweaks
  const portalUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPerlinNoise: { value: perlinNoiseTexture },
      uPortalCenter: { value: portalBounds.center },
      uPortalHalfSize: { value: portalBounds.halfSize },
      uDeepColor: { value: new THREE.Color(PORTAL_DEFAULTS.deepColor) },
      uMidColor: { value: new THREE.Color(PORTAL_DEFAULTS.midColor) },
      uBrightColor: { value: new THREE.Color(PORTAL_DEFAULTS.brightColor) },
      uOpacity: { value: PORTAL_DEFAULTS.opacity },
      uDistortionScale: { value: PORTAL_DEFAULTS.distortionScale },
      uDistortionStrength: { value: PORTAL_DEFAULTS.distortionStrength },
      uDistortionSpeed: { value: PORTAL_DEFAULTS.distortionSpeed },
      uRotationSpeed: { value: PORTAL_DEFAULTS.rotationSpeed },
      uBackgroundStrength: { value: PORTAL_DEFAULTS.backgroundStrength },
      uBackgroundCenterGlow: { value: PORTAL_DEFAULTS.backgroundCenterGlow },
      uBackgroundFalloff: { value: PORTAL_DEFAULTS.backgroundFalloff },
      uBackgroundCloudContrast: {
        value: PORTAL_DEFAULTS.backgroundCloudContrast,
      },
      uRibbonStrength: { value: PORTAL_DEFAULTS.ribbonStrength },
      uRibbonCount: { value: PORTAL_DEFAULTS.ribbonCount },
      uRibbonWidth: { value: PORTAL_DEFAULTS.ribbonWidth },
      uRibbonTwist: { value: PORTAL_DEFAULTS.ribbonTwist },
      uRibbonSpeed: { value: PORTAL_DEFAULTS.ribbonSpeed },
      uRibbonBreakup: { value: PORTAL_DEFAULTS.ribbonBreakup },
      uFilamentStrength: { value: PORTAL_DEFAULTS.filamentStrength },
      uFilamentCount: { value: PORTAL_DEFAULTS.filamentCount },
      uFilamentWidth: { value: PORTAL_DEFAULTS.filamentWidth },
      uFilamentTwist: { value: PORTAL_DEFAULTS.filamentTwist },
      uFilamentSpeed: { value: PORTAL_DEFAULTS.filamentSpeed },
      uFilamentBreakup: { value: PORTAL_DEFAULTS.filamentBreakup },
      uCoreStrength: { value: PORTAL_DEFAULTS.coreStrength },
      uCoreRadius: { value: PORTAL_DEFAULTS.coreRadius },
      uCoreSoftness: { value: PORTAL_DEFAULTS.coreSoftness },
      uCoreHalo: { value: PORTAL_DEFAULTS.coreHalo },
      uCorePulseAmount: { value: PORTAL_DEFAULTS.corePulseAmount },
      uCorePulseSpeed: { value: PORTAL_DEFAULTS.corePulseSpeed },
      uRimStrength: { value: PORTAL_DEFAULTS.rimStrength },
      uRimRadius: { value: PORTAL_DEFAULTS.rimRadius },
      uRimWidth: { value: PORTAL_DEFAULTS.rimWidth },
      uRimWobble: { value: PORTAL_DEFAULTS.rimWobble },
      uRimSpeed: { value: PORTAL_DEFAULTS.rimSpeed },
    }),
    [perlinNoiseTexture, portalBounds]
  );

  // Control factories: every control just writes its uniform through the ref
  const numberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      if (portalMaterialRef.current?.uniforms) {
        portalMaterialRef.current.uniforms[uniform].value = v;
      }
    },
  });

  const colorControl = (uniform, value) => ({
    value,
    onChange: v => {
      if (portalMaterialRef.current?.uniforms) {
        portalMaterialRef.current.uniforms[uniform].value.set(v);
      }
    },
  });

  const d = PORTAL_DEFAULTS;

  useControls(
    'CauldronPortal',
    {
      deepColor: colorControl('uDeepColor', d.deepColor),
      midColor: colorControl('uMidColor', d.midColor),
      brightColor: colorControl('uBrightColor', d.brightColor),
      opacity: numberControl('uOpacity', d.opacity, 0, 1, 0.01),
      distortionScale: numberControl('uDistortionScale', d.distortionScale, 0, 3, 0.01),
      distortionStrength: numberControl('uDistortionStrength', d.distortionStrength, 0, 0.2, 0.001),
      distortionSpeed: numberControl('uDistortionSpeed', d.distortionSpeed, 0, 0.5, 0.001),
      rotationSpeed: numberControl('uRotationSpeed', d.rotationSpeed, -3, 3, 0.01),
      backgroundStrength: numberControl('uBackgroundStrength', d.backgroundStrength, 0, 4, 0.01),
      backgroundCenterGlow: numberControl('uBackgroundCenterGlow', d.backgroundCenterGlow, 0, 4, 0.01),
      backgroundFalloff: numberControl('uBackgroundFalloff', d.backgroundFalloff, 0.1, 8, 0.01),
      backgroundCloudContrast: numberControl('uBackgroundCloudContrast', d.backgroundCloudContrast, 0, 1, 0.01),
      ribbonStrength: numberControl('uRibbonStrength', d.ribbonStrength, 0, 2, 0.01),
      ribbonCount: numberControl('uRibbonCount', d.ribbonCount, 0, 20, 0.5),
      ribbonWidth: numberControl('uRibbonWidth', d.ribbonWidth, 0, 0.5, 0.005),
      ribbonTwist: numberControl('uRibbonTwist', d.ribbonTwist, -10, 10, 0.01),
      ribbonSpeed: numberControl('uRibbonSpeed', d.ribbonSpeed, -3, 3, 0.01),
      ribbonBreakup: numberControl('uRibbonBreakup', d.ribbonBreakup, 0, 1, 0.01),
      filamentStrength: numberControl('uFilamentStrength', d.filamentStrength, 0, 2, 0.01),
      filamentCount: numberControl('uFilamentCount', d.filamentCount, 0, 30, 0.5),
      filamentWidth: numberControl('uFilamentWidth', d.filamentWidth, 0, 0.3, 0.005),
      filamentTwist: numberControl('uFilamentTwist', d.filamentTwist, -10, 10, 0.01),
      filamentSpeed: numberControl('uFilamentSpeed', d.filamentSpeed, -3, 3, 0.01),
      filamentBreakup: numberControl('uFilamentBreakup', d.filamentBreakup, 0, 1, 0.01),
      coreStrength: numberControl('uCoreStrength', d.coreStrength, 0, 3, 0.01),
      coreRadius: numberControl('uCoreRadius', d.coreRadius, 0, 0.5, 0.005),
      coreSoftness: numberControl('uCoreSoftness', d.coreSoftness, 0, 0.5, 0.005),
      coreHalo: numberControl('uCoreHalo', d.coreHalo, 0, 2, 0.01),
      corePulseAmount: numberControl('uCorePulseAmount', d.corePulseAmount, 0, 0.5, 0.001),
      corePulseSpeed: numberControl('uCorePulseSpeed', d.corePulseSpeed, 0, 3, 0.01),
      rimStrength: numberControl('uRimStrength', d.rimStrength, 0, 2, 0.01),
      rimRadius: numberControl('uRimRadius', d.rimRadius, 0.5, 1.2, 0.005),
      rimWidth: numberControl('uRimWidth', d.rimWidth, 0, 0.3, 0.005),
      rimWobble: numberControl('uRimWobble', d.rimWobble, 0, 0.5, 0.001),
      rimSpeed: numberControl('uRimSpeed', d.rimSpeed, -3, 3, 0.01),
    },
    { collapsed: true }
  );

  useFrame(({ clock }, delta) => {
    island.nodes.pot.rotation.y += delta * SPEED;

    if (portalMaterialRef.current?.uniforms) {
      portalMaterialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <skinnedMesh
      name="island_8"
      geometry={island.nodes.island_8.geometry}
      skeleton={island.nodes.island_8.skeleton}
      morphTargetDictionary={island.nodes.island_8.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_8.morphTargetInfluences}
    >
      <CustomShaderMaterial
        ref={portalMaterialRef}
        baseMaterial={THREE.MeshStandardMaterial}
        vertexShader={portalVertexShader}
        fragmentShader={portalFragmentShader}
        uniforms={portalUniforms}
      />
    </skinnedMesh>
  );
};

useTexture.preload(perlinNoiseImage);

export { Cauldron };
