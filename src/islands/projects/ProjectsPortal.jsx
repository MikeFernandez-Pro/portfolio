import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Circle } from '@react-three/drei/webgpu';
import { useControls } from '#debug/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';

import { subscribeWhenSet, useStore } from '#store';
import { useDistanceVolume } from '#utils/useDistanceVolume.js';
import { pointLights } from '#islands/world/pointLights/pointLights.js';
import {
  pointLightControls,
  settingControl,
} from '#islands/world/pointLights/pointLightControls.js';

import PortalAudio from '#assets/sounds/portal.mp3';

// Project images live in the shared sRGB screens atlas; they are wider than
// tall on purpose: the portal shows a centered square crop and the spare
// width feeds the horizontal parallax
import {
  useScreensAtlasTexture,
  useVoronoiPerlinTexture,
} from '#utils/packedTextures.js';

import { PROJECTS } from './projects.js';
import {
  createPortalDiscMaterial,
  createPortalDiscUniforms,
  portalDiscControls,
} from './portalDisc.js';
import { createPortalSparks, portalSparksControls } from './portalSparks.js';

// The portal light sits at the disc center
const PORTAL_POSITION = pointLights.portal.position.value.clone();
const PORTAL_OPEN_SIZE = 0.36;

const ProjectsPortal = props => {
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

  // TSL uniform nodes: the open animation, the project selection and the
  // controls write their .value
  const { portalMaterial, portalUniforms } = useMemo(() => {
    const portalUniforms = createPortalDiscUniforms();
    const portalMaterial = createPortalDiscMaterial(
      portalUniforms,
      screensAtlasTexture,
      perlinTexture
    );
    return { portalMaterial, portalUniforms };
  }, [perlinTexture, screensAtlasTexture]);

  useEffect(() => () => portalMaterial.dispose(), [portalMaterial]);

  const { sparks, uniforms: sparksUniforms } = useMemo(
    () => createPortalSparks(PORTAL_POSITION),
    []
  );

  useEffect(() => () => sparks.material.dispose(), [sparks]);

  useDistanceVolume(portalSoundEffect, PORTAL_POSITION, {
    maxDistance: 13,
    gain: 2,
    cap: 0.8,
    volumeKey: 'portal',
  });

  // Target radius of the open portal; the scale-up animation reads it live
  const openSizeRef = useRef(PORTAL_OPEN_SIZE);

  useControls('ProjectsPortal', {
    size: {
      value: PORTAL_OPEN_SIZE,
      min: 0,
      max: 0.71,
      step: 0.005,
      onChange: value => {
        openSizeRef.current = value;
        // Resize live only once the portal has opened, otherwise the circle
        // would show up without any project texture
        if (useStore.getState().selectedProject) {
          portalUniforms.uSize.value = value;
        }
      },
    },
    ...portalDiscControls(portalUniforms),
  });

  const portalDiscRef = useRef(null);

  useControls('PortalSparks', portalSparksControls(sparks, sparksUniforms));

  useControls(
    'PortalLight',
    pointLightControls(pointLights.portal, {
      // Scaled by the open factor every frame (see below)
      intensity: settingControl(pointLights.portal, 'intensity', 0, 10, 0.05),
    })
  );

  // Animation

  useEffect(() => {
    // Every portal visual (GLB swirl mesh, shader disc, sparks) stays hidden
    // until a project is selected (the subscription below catches up on a
    // remount)
    const applyPortalVisibility = visible => {
      portal.visible = visible;
      if (portalDiscRef.current) portalDiscRef.current.visible = visible;
      sparks.visible = visible;
    };
    applyPortalVisibility(false);

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
          portalUniforms.uSize.value = openProgress.value * openSizeRef.current;
        },
      }
    );

    // Point the shader at the selected project's atlas rect and open
    const unsubSelectedProject = subscribeWhenSet(
      state => state.selectedProject,
      selectedProject => {
        applyPortalVisibility(true);
        const rect = PROJECTS[selectedProject].screen;
        portalUniforms.uTextureOffset.value.copy(rect.offset);
        portalUniforms.uTextureSize.value.copy(rect.size);
        portalUniforms.uTextureAspect.value = rect.aspect;
        portalScaleUpAnimation.restart();
        portalSoundEffect.play();
      }
    );

    // Remove subscriptions on unmount
    return () => {
      unsubSelectedProject();
      portalScaleUpAnimation?.kill();
    };
  }, [portalUniforms, sparks, portalSoundEffect]);

  useFrame((state, delta) => {
    // Hidden until a project is selected (the subscription above flips the
    // visibility): skip the rotation and the whole uniform feed. The
    // portal light is initialized off, so it waits too.
    if (!portal.visible) return;

    portal.rotation.y += delta * 0.15;

    // Sparks grow in with the very first portal opening, then the ratchet
    // keeps them at full strength: re-pressing a plate replays the disc
    // scale-up but must not make the sparks vanish and reappear
    const openFactor = Math.max(
      sparksUniforms.uOpenFactor.value,
      THREE.MathUtils.clamp(
        portalUniforms.uSize.value / openSizeRef.current,
        0,
        1
      )
    );

    sparksUniforms.uOpenFactor.value = openFactor;
    // The island point light follows the same ratchet: off until the first
    // opening, full strength forever after
    pointLights.portal.intensity.value =
      pointLights.portal.settings.intensity * openFactor;
  });

  return (
    <>
      <Circle
        ref={portalDiscRef}
        args={[0.8, 32]}
        material={portalMaterial}
        position={PORTAL_POSITION}
      />
      <primitive object={sparks} />
    </>
  );
};

export { ProjectsPortal };
