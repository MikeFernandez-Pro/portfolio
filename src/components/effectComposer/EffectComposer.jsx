import {
  EffectComposer as EffectComposerR3F,
  Bloom,
  SMAA,
  N8AO,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useControls } from '#utils/useControls.jsx';

import { BlurPass } from './BlurPass.jsx';
import { SceneRevealer } from './SceneRevealer.jsx';

const EffectComposer = props => {
  const { sceneRevealerRef, horizontalBlurPassRef, verticalBlurPassRef } =
    props;

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
      aoSamples: { value: 16, min: 1, max: 16, step: 1 },
      denoiseSamples: { value: 4, min: 1, max: 4, step: 1 },
      denoiseRadius: { value: 12, min: 1, max: 12, step: 1 },
      color: { value: '#bce3ff' },
      halfRes: true,
      depthAwareUpsampling: false,
      screenSpaceRadius: false,
      renderMode: { value: 0, options: [0, 1, 2, 3, 4] },
    },
    { collapsed: true }
  );

  return (
    <EffectComposerR3F enableNormalPass={false} multisampling={0}>
      <SceneRevealer sceneRevealerRef={sceneRevealerRef} />
      <Vignette />
      <BlurPass
        horizontalBlurPassRef={horizontalBlurPassRef}
        verticalBlurPassRef={verticalBlurPassRef}
      />
      <N8AO {...controls} quality={controls.quality} />
      <Bloom
        mipmapBlur
        luminanceThreshold={2}
        luminanceSmoothing={1}
        intensity={2}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposerR3F>
  );
};

export { EffectComposer };
