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

// Project images are wider than tall on purpose: the portal shows a centered
// square crop and the spare width feeds the horizontal parallax
import portalProjectImage from '#assets/textures/santa-clous-fighting.png';
import seaProjectImage from '#assets/textures/doan-ten-con-.png';
import halloweenProjectImage from '#assets/textures/halloween-scene.png';
import perlinNoiseImage from '#assets/textures/perlin.png';

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

  // The project images are sRGB-authored; left on the default NoColorSpace
  // they'd be sampled as linear and re-encoded by colorspace_fragment on
  // output, washing the colors out
  useEffect(() => {
    Object.values(portalsTextures).forEach(texture => {
      if (texture.colorSpace !== THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
      }
    });
  }, [portalsTextures]);

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
          uParallaxDepth: { value: PORTAL_SHADER_DEFAULTS.parallaxDepth },
          uTextureAspect: { value: 1 },
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
          const texture = portalsTextures[activePlate];
          portalShaderMaterial.uniforms.uTextureMap.value = texture;
          portalShaderMaterial.uniforms.uTextureAspect.value =
            texture.image.width / texture.image.height;
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
