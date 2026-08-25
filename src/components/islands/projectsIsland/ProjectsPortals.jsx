import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Circle } from '@react-three/drei';
import { useControls } from '#utils/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import {
  PORTAL_LIGHT_DEFAULTS,
  portalLightSettings,
  portalLightUniforms,
} from '#islands/common/islandPointLights.js';

import portalVertexShader from '#shaders/portal/vertex.glsl';
import portalFragmentShader from '#shaders/portal/fragment.glsl';
import portalSparksVertexShader from '#shaders/portalSparks/vertex.glsl';
import portalSparksFragmentShader from '#shaders/portalSparks/fragment.glsl';

import PortalAudio from '#assets/sounds/portal.mp3';

// Project images live in the shared sRGB screens atlas; they are wider than
// tall on purpose: the portal shows a centered square crop and the spare
// width feeds the horizontal parallax
import {
  useScreensAtlasTexture,
  useVoronoiPerlinTexture,
  SCREENS_ATLAS_RECTS,
} from '#utils/packedTextures.js';

// Atlas rect shown by each pressure plate
const PORTAL_PLATE_RECTS = {
  portalPlate: SCREENS_ATLAS_RECTS.santaClousFighting,
  seaPlate: SCREENS_ATLAS_RECTS.doanTenCon,
  halloweenPlate: SCREENS_ATLAS_RECTS.halloweenScene,
};

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7);
const PORTAL_OPEN_SIZE = 0.36;

// Current visuals, tweakable from the 'ProjectsPortal' debug folder
const PORTAL_SHADER_DEFAULTS = {
  noiseScale: 1.14,
  noiseSpeed: 0.05,
  deformationStart: 0.3,
  deformationEnd: 0.41,
  deformationStrength: 0.18,
  textureDistortion: 0.42,
  // Fake window-interior parallax on the project image, driven by the
  // camera (which follows the character): depth of the virtual image plane
  // behind the disc. The offset is horizontal only — the images' extra
  // width is the slide margin, so no zoom inset is needed
  parallaxDepth: 0.4,
  // Emissive edge ring; intensity > 2 crosses the Bloom threshold
  rimColor: '#ffffff',
  rimIntensity: 3.7,
  rimWidth: 0.02,
  lighting: 1,
  saturation: 1.16,
  sizePulseSpeed: 2.39,
  sizePulseMin: 0.063,
  sizePulseMax: 0.1,
  // Noise flow field that pushes the project texture around
  distortionScale: 0.78,
  distortionStrength: 0.382,
  distortionSpeed: 0.033,
};

// Sparks spiralling into the open portal, as if it were sucking in reality
const SPARKS_DEFAULTS = {
  count: 80,
  color: '#00a3ff',
  intensity: 20,
  size: 0.043,
  speed: 0.12,
  spawnRadius: 1.3,
  swirlTurns: 0.35,
  frontOffset: 0.9,
};

// Buffers are allocated at the max once; the live count control only moves
// the geometry draw range
const SPARKS_COUNT = 200;
const sparksPositions = new Float32Array(SPARKS_COUNT * 3);
const sparksSizes = new Float32Array(SPARKS_COUNT);
const sparksAngles = new Float32Array(SPARKS_COUNT);
const sparksSpeeds = new Float32Array(SPARKS_COUNT);
const sparksPhases = new Float32Array(SPARKS_COUNT);

for (let i = 0; i < SPARKS_COUNT; i++) {
  sparksSizes[i] = Math.random() * 0.6 + 0.4;
  sparksAngles[i] = Math.random() * Math.PI * 2;
  sparksSpeeds[i] = Math.random() * 0.8 + 0.6;
  sparksPhases[i] = Math.random();
}

const ProjectsPortals = props => {
  const { island } = props;

  const portal = island.nodes.portal;

  const portalSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PortalAudio],
        autoplay: false,
        loop: true,
        volume: 0,
      }),
    [PortalAudio]
  );

  // Textures
  const screensAtlasTexture = useScreensAtlasTexture();

  const perlinTexture = useVoronoiPerlinTexture();

  // Material
  const portalShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: -0.2 },
          uTextureMap: { value: screensAtlasTexture },
          // Atlas rect of the active project image; set by the activePlate
          // subscription before the portal ever opens
          uTextureOffset: { value: new THREE.Vector2(0, 0) },
          uTextureSize: { value: new THREE.Vector2(1, 1) },
          uSizePulseSpeed: { value: PORTAL_SHADER_DEFAULTS.sizePulseSpeed },
          uSizePulseMin: { value: PORTAL_SHADER_DEFAULTS.sizePulseMin },
          uSizePulseMax: { value: PORTAL_SHADER_DEFAULTS.sizePulseMax },
          uPerlinTexture: { value: perlinTexture },
          uNoiseScale: { value: PORTAL_SHADER_DEFAULTS.noiseScale },
          uNoiseSpeed: { value: PORTAL_SHADER_DEFAULTS.noiseSpeed },
          uDeformationStart: { value: PORTAL_SHADER_DEFAULTS.deformationStart },
          uDeformationEnd: { value: PORTAL_SHADER_DEFAULTS.deformationEnd },
          uDeformationStrength: {
            value: PORTAL_SHADER_DEFAULTS.deformationStrength,
          },
          uTextureDistortion: {
            value: PORTAL_SHADER_DEFAULTS.textureDistortion,
          },
          uParallaxDepth: { value: PORTAL_SHADER_DEFAULTS.parallaxDepth },
          uTextureAspect: { value: 1 },
          uRimColor: {
            value: new THREE.Color(PORTAL_SHADER_DEFAULTS.rimColor),
          },
          uRimIntensity: { value: PORTAL_SHADER_DEFAULTS.rimIntensity },
          uRimWidth: { value: PORTAL_SHADER_DEFAULTS.rimWidth },
          uLighting: { value: PORTAL_SHADER_DEFAULTS.lighting },
          uSaturation: { value: PORTAL_SHADER_DEFAULTS.saturation },
          uDistortionScale: { value: PORTAL_SHADER_DEFAULTS.distortionScale },
          uDistortionStrength: {
            value: PORTAL_SHADER_DEFAULTS.distortionStrength,
          },
          uDistortionSpeed: { value: PORTAL_SHADER_DEFAULTS.distortionSpeed },
        },
        transparent: true,
      }),
    [portalVertexShader, portalFragmentShader, perlinTexture, screensAtlasTexture]
  );

  const portalSparksMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: portalSparksVertexShader,
        fragmentShader: portalSparksFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uOpenFactor: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uSize: { value: SPARKS_DEFAULTS.size },
          uColor: { value: new THREE.Color(SPARKS_DEFAULTS.color) },
          uIntensity: { value: SPARKS_DEFAULTS.intensity },
          uSpawnRadius: { value: SPARKS_DEFAULTS.spawnRadius },
          uSwirlTurns: { value: SPARKS_DEFAULTS.swirlTurns },
          uFrontOffset: { value: SPARKS_DEFAULTS.frontOffset },
          uSpeed: { value: SPARKS_DEFAULTS.speed },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [portalSparksVertexShader, portalSparksFragmentShader]
  );

  // Target radius of the open portal; the scale-up animation reads it live
  const openSizeRef = useRef(PORTAL_OPEN_SIZE);

  // Control factories: every control writes its uniform straight through,
  // no re-render
  const numberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      portalShaderMaterial.uniforms[uniform].value = v;
    },
  });

  const colorControl = (uniform, value) => ({
    value,
    onChange: v => {
      portalShaderMaterial.uniforms[uniform].value.set(v);
    },
  });

  const d = PORTAL_SHADER_DEFAULTS;

  useControls(
    'ProjectsPortal',
    {
      size: {
        value: PORTAL_OPEN_SIZE,
        min: 0,
        max: 0.71,
        step: 0.005,
        onChange: value => {
          openSizeRef.current = value;
          // Resize live only once a portal has been opened, otherwise the
          // circle would show up without any project texture
          if (useStore.getState().activePlate) {
            portalShaderMaterial.uniforms.uSize.value = value;
          }
        },
      },
      sizePulseSpeed: numberControl(
        'uSizePulseSpeed',
        d.sizePulseSpeed,
        0,
        10,
        0.01
      ),
      sizePulseMin: numberControl(
        'uSizePulseMin',
        d.sizePulseMin,
        -0.1,
        0.1,
        0.001
      ),
      sizePulseMax: numberControl(
        'uSizePulseMax',
        d.sizePulseMax,
        -0.1,
        0.1,
        0.001
      ),
      noiseScale: numberControl('uNoiseScale', d.noiseScale, 0, 5, 0.01),
      noiseSpeed: numberControl('uNoiseSpeed', d.noiseSpeed, 0, 0.5, 0.001),
      deformationStart: numberControl(
        'uDeformationStart',
        d.deformationStart,
        0,
        0.7,
        0.005
      ),
      deformationEnd: numberControl(
        'uDeformationEnd',
        d.deformationEnd,
        0,
        0.7,
        0.005
      ),
      deformationStrength: numberControl(
        'uDeformationStrength',
        d.deformationStrength,
        0,
        1,
        0.005
      ),
      textureDistortion: numberControl(
        'uTextureDistortion',
        d.textureDistortion,
        0,
        3,
        0.01
      ),
      parallaxDepth: numberControl(
        'uParallaxDepth',
        d.parallaxDepth,
        0,
        0.5,
        0.005
      ),
      rimColor: colorControl('uRimColor', d.rimColor),
      rimIntensity: numberControl('uRimIntensity', d.rimIntensity, 0, 20, 0.1),
      rimWidth: numberControl('uRimWidth', d.rimWidth, 0, 0.2, 0.001),
      lighting: numberControl('uLighting', d.lighting, 0, 3, 0.01),
      saturation: numberControl('uSaturation', d.saturation, 0, 2, 0.01),
      distortionScale: numberControl(
        'uDistortionScale',
        d.distortionScale,
        0,
        3,
        0.01
      ),
      distortionStrength: numberControl(
        'uDistortionStrength',
        d.distortionStrength,
        0,
        0.5,
        0.001
      ),
      distortionSpeed: numberControl(
        'uDistortionSpeed',
        d.distortionSpeed,
        0,
        0.5,
        0.001
      ),
    },
    { collapsed: true, reset: true }
  );

  const sparksNumberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      portalSparksMaterial.uniforms[uniform].value = v;
    },
  });

  const sparksGeometryRef = useRef(null);

  useControls(
    'PortalSparks',
    {
      count: {
        value: SPARKS_DEFAULTS.count,
        min: 0,
        max: SPARKS_COUNT,
        step: 1,
        onChange: v => {
          sparksGeometryRef.current?.setDrawRange(0, v);
        },
      },
      color: {
        value: SPARKS_DEFAULTS.color,
        onChange: v => {
          portalSparksMaterial.uniforms.uColor.value.set(v);
        },
      },
      intensity: sparksNumberControl(
        'uIntensity',
        SPARKS_DEFAULTS.intensity,
        0,
        20,
        0.1
      ),
      size: sparksNumberControl('uSize', SPARKS_DEFAULTS.size, 0, 0.3, 0.001),
      speed: sparksNumberControl('uSpeed', SPARKS_DEFAULTS.speed, 0, 1, 0.005),
      spawnRadius: sparksNumberControl(
        'uSpawnRadius',
        SPARKS_DEFAULTS.spawnRadius,
        0,
        3,
        0.01
      ),
      swirlTurns: sparksNumberControl(
        'uSwirlTurns',
        SPARKS_DEFAULTS.swirlTurns,
        -2,
        2,
        0.01
      ),
      frontOffset: sparksNumberControl(
        'uFrontOffset',
        SPARKS_DEFAULTS.frontOffset,
        0,
        3,
        0.01
      ),
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'PortalLight',
    {
      color: {
        value: PORTAL_LIGHT_DEFAULTS.color,
        onChange: v => {
          portalLightUniforms.uPortalLightColor.value.set(v);
        },
      },
      intensity: {
        value: PORTAL_LIGHT_DEFAULTS.intensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          portalLightSettings.intensity = v;
        },
      },
      decay: {
        value: PORTAL_LIGHT_DEFAULTS.decay,
        min: 0,
        max: 1,
        step: 0.005,
        onChange: v => {
          portalLightUniforms.uPortalLightDecay.value = v;
        },
      },
      decayPower: {
        value: PORTAL_LIGHT_DEFAULTS.decayPower,
        min: 0.1,
        max: 8,
        step: 0.05,
        onChange: v => {
          portalLightUniforms.uPortalLightDecayPower.value = v;
        },
      },
      specularPower: {
        value: PORTAL_LIGHT_DEFAULTS.specularPower,
        min: 1,
        max: 64,
        step: 1,
        onChange: v => {
          portalLightUniforms.uPortalLightSpecularPower.value = v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  // Animation

  useEffect(() => {
    // Animate a progress value and scale by the (tweakable) open size, so
    // the animation target doesn't get baked in at creation time
    const openProgress = { value: 0 };
    const portalScaleUpAnimation = gsap.fromTo(
      openProgress,
      { value: 0 },
      {
        value: 1,
        duration: 0.3,
        paused: true,
        ease: 'power2.out',
        onUpdate: () => {
          portalShaderMaterial.uniforms.uSize.value =
            openProgress.value * openSizeRef.current;
        },
      }
    );

    // Retrieve current activated plate and point the shader at its atlas rect
    const unsubActivaPlate = useStore.subscribe(
      state => state.activePlate,
      activePlate => {
        if (activePlate) {
          const rect = PORTAL_PLATE_RECTS[activePlate];
          portalShaderMaterial.uniforms.uTextureOffset.value.copy(rect.offset);
          portalShaderMaterial.uniforms.uTextureSize.value.copy(rect.size);
          portalShaderMaterial.uniforms.uTextureAspect.value = rect.aspect;
          portalScaleUpAnimation.restart();
          portalSoundEffect.play();
        }
      }
    );

    // Update portal sound effect volume based on character position
    const unsubCharacterPosition = useStore.subscribe(
      state => state.characterPosition,
      characterPosition => {
        if (characterPosition) {
          portalSoundEffect.volume(
            PORTAL_POSITION.distanceTo(characterPosition) < 13
              ? Math.min(
                  (1 / PORTAL_POSITION.distanceTo(characterPosition)) * 2,
                  0.8
                ) * SOUND_VOLUMES.portal
              : 0
          );
        }
      }
    );

    // Remove subscriptions on unmount
    return () => {
      unsubActivaPlate();
      unsubCharacterPosition();
      portalScaleUpAnimation?.kill();
    };
  }, [portalShaderMaterial, portalSoundEffect]);

  useFrame(({ clock, size, viewport }, delta) => {
    portal.rotation.y += delta * 0.15;
    portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime;

    portalSparksMaterial.uniforms.uTime.value = clock.elapsedTime;
    // Sparks grow in with the very first portal opening, then the ratchet
    // keeps them at full strength: re-pressing a plate replays the disc
    // scale-up but must not make the sparks vanish and reappear
    const openFactor = Math.max(
      portalSparksMaterial.uniforms.uOpenFactor.value,
      THREE.MathUtils.clamp(
        portalShaderMaterial.uniforms.uSize.value / openSizeRef.current,
        0,
        1
      )
    );
    portalSparksMaterial.uniforms.uOpenFactor.value = openFactor;
    // The island point light follows the same ratchet: off until the first
    // opening, full strength forever after
    portalLightUniforms.uPortalLightIntensity.value =
      portalLightSettings.intensity * openFactor;
    portalSparksMaterial.uniforms.uResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr
    );
  });

  return (
    <>
      <Circle
        args={[0.8, 32]}
        material={portalShaderMaterial}
        position={[-16.12, 6.95, -37.7]}
      />
      {/* Positions live in the vertex shader; the zeroed buffer would make
          the bounding sphere a point, so culling is disabled */}
      <points
        position={[-16.12, 6.95, -37.7]}
        material={portalSparksMaterial}
        frustumCulled={false}
      >
        <bufferGeometry ref={sparksGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            count={SPARKS_COUNT}
            array={sparksPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={SPARKS_COUNT}
            array={sparksSizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aAngle"
            count={SPARKS_COUNT}
            array={sparksAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSpeed"
            count={SPARKS_COUNT}
            array={sparksSpeeds}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            count={SPARKS_COUNT}
            array={sparksPhases}
            itemSize={1}
          />
        </bufferGeometry>
      </points>
    </>
  );
};

export { ProjectsPortals };
