import { useRef } from 'react';
import {
  EffectComposer as EffectComposerR3F,
  SMAA,
  N8AO,
  ToneMapping,
  Vignette,
  Bloom,
} from '@react-three/postprocessing';
import { PredicationMode, SMAAPreset, ToneMappingMode } from 'postprocessing';
import { useControls } from '#utils/useControls.jsx';

import { CheapDofPass } from './CheapDofPass.jsx';
import { SceneRevealer } from './SceneRevealer.jsx';
import { IS_MOBILE_DEVICE, IS_PHOTO_MODE, COMPOSER_MSAA } from '#utils/utils.js';
import { useStore } from '#store/ZustandStorage.jsx';

const EffectComposer = props => {
  const { sceneRevealerRef, cheapDofPassRef } = props;

  const controls = useControls(
    'Ambient Occlusion',
    {
      aoRadius: 1,
      distanceFalloff: 3,
      intensity: { value: 1.5, min: 0.01, max: 1.5, step: 0.01 },
      quality: {
        value: 'performance',
        options: ['performance', 'low', 'medium', 'high', 'ultra'],
      },
      aoSamples: { value: 6, min: 1, max: 16, step: 1 },
      denoiseSamples: { value: 3, min: 1, max: 4, step: 1 },
      denoiseRadius: { value: 12, min: 1, max: 12, step: 1 },
      color: { value: '#bce3ff' },
      halfRes: true,
      depthAwareUpsampling: false,
      screenSpaceRadius: false,
      renderMode: { value: 0, options: [0, 1, 2, 3, 4] },
    },
    { collapsed: true }
  );

  // intensity is a live setter; levels/radius/luminance* go through Bloom's
  // constructor args and reconstruct the effect when they change
  const bloom = useControls(
    'Bloom',
    {
      intensity: {
        value: 2.2,
        min: 0,
        max: 10,
        step: 0.1,
      },
      levels: {
        value: 7,
        min: 1,
        max: 9,
        step: 1,
      },
      radius: {
        value: 0.85,
        min: 0,
        max: 1,
        step: 0.01,
      },
      luminanceThreshold: {
        value: 2,
        min: 0,
        max: 5,
        step: 0.05,
      },
      luminanceSmoothing: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.05,
      },
    },
    { collapsed: true }
  );

  const experienceStarted = useStore(state => state.experienceStarted);

  // Live MSAA switch for A/B against SMAA-only. The prop below only seeds the
  // composer; postprocessing exposes `multisampling` as a setter that
  // disposes the HDR buffers so three recreates them with the new sample
  // count on the next frame (no remount). Initial onChange equals
  // COMPOSER_MSAA, which the setter early-outs on.
  const composerRef = useRef();
  useControls(
    'Antialiasing',
    {
      msaa: {
        value: COMPOSER_MSAA,
        options: [0, 2, 4, 8],
        onChange: value => {
          if (composerRef.current) composerRef.current.multisampling = value;
        },
      },
    },
    { collapsed: true }
  );

  return (
    <EffectComposerR3F
      ref={composerRef}
      enableNormalPass={false}
      multisampling={COMPOSER_MSAA}
    >
    <SceneRevealer sceneRevealerRef={sceneRevealerRef} />

    {!IS_MOBILE_DEVICE && (
      <N8AO {...controls} quality={controls.quality} />
    )}

    {!IS_MOBILE_DEVICE && !IS_PHOTO_MODE && (
      <CheapDofPass
        cheapDofPassRef={cheapDofPassRef}
        enabled={experienceStarted}
      />
    )}

    <Bloom mipmapBlur {...bloom} />

    <Vignette />

    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

    {/* After tone mapping (SMAA wants LDR). ULTRA searches longer edges; depth
        predication catches geometry edges the color detector misses. Sub-pixel
        geometry is MSAA's job (COMPOSER_MSAA), SMAA cleans shader aliasing */}
    <SMAA preset={SMAAPreset.ULTRA} predicationMode={PredicationMode.DEPTH} />
  </EffectComposerR3F>
  );
};

export { EffectComposer };
