import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Circle, useTexture } from '@react-three/drei';
import { useControls } from '#utils/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';

import portalVertexShader from '#shaders/portal/vertex.glsl';
import portalFragmentShader from '#shaders/portal/fragment.glsl';

import PortalAudio from '#assets/sounds/portal.mp3';

import portalProjectImage from '#assets/textures/portal-project.webp';
import seaProjectImage from '#assets/textures/sea-project.webp';
import halloweenProjectImage from '#assets/textures/halloween-project.webp';
import perlinNoiseImage from '#assets/textures/perlin.png';

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7);
const PORTAL_OPEN_SIZE = 0.33;

// Current visuals, tweakable from the 'ProjectsPortal' debug folder
const PORTAL_SHADER_DEFAULTS = {
  noiseScale: 1.58,
  noiseSpeed: 0.05,
  deformationStart: 0.3,
  deformationEnd: 0.395,
  deformationStrength: 0.285,
  textureDistortion: 1.63,
  lighting: 1,
  saturation: 1.39,
  sizePulseSpeed: 2.37,
  sizePulseMin: 0.032,
  sizePulseMax: 0.1,
  // Swirl overlay ported from the cauldron potion portal, reduced to the
  // flat background veil + filaments. backgroundStrength 0.21 matches the
  // old edge veil (0.26 depth base * 0.8) now that the radial glow is gone.
  deepColor: '#535353',
  midColor: '#ffffff',
  brightColor: '#ffffff',
  swirlOpacity: 0.19,
  distortionScale: 2.19,
  distortionStrength: 0.381,
  distortionSpeed: 0.1,
  swirlRotationSpeed: 0.6,
  backgroundStrength: 0.21,
  backgroundCloudContrast: 0,
  filamentStrength: 1.05,
  filamentCount: 5.5,
  filamentWidth: 0.045,
  filamentTwist: 10,
  filamentSpeed: -0.19,
  filamentBreakup: 0.37,
};

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
  const portalsTextures = useMemo(
    () => ({
      portalPlate: useLoader(THREE.TextureLoader, portalProjectImage),
      seaPlate: useLoader(THREE.TextureLoader, seaProjectImage),
      halloweenPlate: useLoader(THREE.TextureLoader, halloweenProjectImage),
    }),
    [portalProjectImage, seaProjectImage, halloweenProjectImage]
  );

  const perlinTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  // Material
  const portalShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: -0.2 },
          uTextureMap: { value: undefined },
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
          uLighting: { value: PORTAL_SHADER_DEFAULTS.lighting },
          uSaturation: { value: PORTAL_SHADER_DEFAULTS.saturation },
          uDeepColor: {
            value: new THREE.Color(PORTAL_SHADER_DEFAULTS.deepColor),
          },
          uMidColor: {
            value: new THREE.Color(PORTAL_SHADER_DEFAULTS.midColor),
          },
          uBrightColor: {
            value: new THREE.Color(PORTAL_SHADER_DEFAULTS.brightColor),
          },
          uSwirlOpacity: { value: PORTAL_SHADER_DEFAULTS.swirlOpacity },
          uDistortionScale: { value: PORTAL_SHADER_DEFAULTS.distortionScale },
          uDistortionStrength: {
            value: PORTAL_SHADER_DEFAULTS.distortionStrength,
          },
          uDistortionSpeed: { value: PORTAL_SHADER_DEFAULTS.distortionSpeed },
          uSwirlRotationSpeed: {
            value: PORTAL_SHADER_DEFAULTS.swirlRotationSpeed,
          },
          uBackgroundStrength: {
            value: PORTAL_SHADER_DEFAULTS.backgroundStrength,
          },
          uBackgroundCloudContrast: {
            value: PORTAL_SHADER_DEFAULTS.backgroundCloudContrast,
          },
          uFilamentStrength: {
            value: PORTAL_SHADER_DEFAULTS.filamentStrength,
          },
          uFilamentCount: { value: PORTAL_SHADER_DEFAULTS.filamentCount },
          uFilamentWidth: { value: PORTAL_SHADER_DEFAULTS.filamentWidth },
          uFilamentTwist: { value: PORTAL_SHADER_DEFAULTS.filamentTwist },
          uFilamentSpeed: { value: PORTAL_SHADER_DEFAULTS.filamentSpeed },
          uFilamentBreakup: { value: PORTAL_SHADER_DEFAULTS.filamentBreakup },
        },
        transparent: true,
      }),
    [portalVertexShader, portalFragmentShader, perlinTexture]
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
      lighting: numberControl('uLighting', d.lighting, 0, 3, 0.01),
      saturation: numberControl('uSaturation', d.saturation, 0, 2, 0.01),
      deepColor: colorControl('uDeepColor', d.deepColor),
      midColor: colorControl('uMidColor', d.midColor),
      brightColor: colorControl('uBrightColor', d.brightColor),
      swirlOpacity: numberControl('uSwirlOpacity', d.swirlOpacity, 0, 1, 0.01),
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
      swirlRotationSpeed: numberControl(
        'uSwirlRotationSpeed',
        d.swirlRotationSpeed,
        -3,
        3,
        0.01
      ),
      backgroundStrength: numberControl(
        'uBackgroundStrength',
        d.backgroundStrength,
        0,
        4,
        0.01
      ),
      backgroundCloudContrast: numberControl(
        'uBackgroundCloudContrast',
        d.backgroundCloudContrast,
        0,
        1,
        0.01
      ),
      filamentStrength: numberControl(
        'uFilamentStrength',
        d.filamentStrength,
        0,
        2,
        0.01
      ),
      filamentCount: numberControl(
        'uFilamentCount',
        d.filamentCount,
        0,
        30,
        0.5
      ),
      filamentWidth: numberControl(
        'uFilamentWidth',
        d.filamentWidth,
        0,
        0.3,
        0.005
      ),
      filamentTwist: numberControl(
        'uFilamentTwist',
        d.filamentTwist,
        -10,
        10,
        0.01
      ),
      filamentSpeed: numberControl(
        'uFilamentSpeed',
        d.filamentSpeed,
        -3,
        3,
        0.01
      ),
      filamentBreakup: numberControl(
        'uFilamentBreakup',
        d.filamentBreakup,
        0,
        1,
        0.01
      ),
    },
    { collapsed: true }
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

    // Retrieve current activated plate and update shader texture accordingly
    const unsubActivaPlate = useStore.subscribe(
      state => state.activePlate,
      activePlate => {
        if (activePlate) {
          portalShaderMaterial.uniforms.uTextureMap.value =
            portalsTextures[activePlate];
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
  }, [portalShaderMaterial, portalSoundEffect, portalsTextures]);

  useFrame(({ clock }, delta) => {
    portal.rotation.y += delta * 0.15;
    portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <Circle
      args={[0.8, 32]}
      material={portalShaderMaterial}
      position={[-16.12, 6.95, -37.7]}
    />
  );
};

useTexture.preload({
  portalProjectImage,
  seaProjectImage,
  halloweenProjectImage,
  perlinNoiseImage,
});

export { ProjectsPortals };
