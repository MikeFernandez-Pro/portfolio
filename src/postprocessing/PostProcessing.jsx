import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { useStore } from '#store';

import {
  AO_DEFAULTS,
  BLOOM_DEFAULTS,
  applyNodeSetting,
  createPipeline,
  createPipelineParams,
} from './pipeline.js';
import { CHEAP_DOF_DEFAULTS } from './cheapDof.js';
import { useIris } from './useIris.js';

// Antialiasing: 4x MSAA on the scene pass (desktop) + SMAA after tone
// mapping; mobile is SMAA-only. The debug "Antialiasing" msaa control
// rebuilds the pipeline for A/B. MSAA extrapolates varyings past their
// vertex range on thin geometry and TSL has no centroid sampling: anything
// fed into a mix/threshold there is clamped (lantern, grass)
const COMPOSER_MSAA = IS_MOBILE_DEVICE ? 0 : 4;

// Effects the debug "Effects" folder can switch off (a switch rebuilds the
// pipeline without them, so their cost goes away too). Production keeps them
// all on: the headless useControls returns these schema values
const EFFECTS_DEFAULTS = {
  ambientOcclusion: true,
  depthOfField: true,
  bloom: true,
  vignette: true,
  smaa: true,
};

// Debug folders. Shared uniforms are written directly; GTAO and bloom values
// go into params (the next rebuild applies them) and onto the live nodes
const usePostProcessingControls = (params, postRef) => {
  const setNodeSetting = (effect, key) => value => {
    params[effect][key] = value;
    applyNodeSetting(postRef.current, params, effect, key);
  };

  const a = AO_DEFAULTS;
  const ao = key => setNodeSetting('ao', key);
  useControls('Ambient Occlusion', {
    radius: {
      value: a.radius,
      min: 0.01,
      max: 4,
      step: 0.01,
      onChange: ao('radius'),
    },
    distanceExponent: {
      value: a.distanceExponent,
      min: 1,
      max: 4,
      step: 0.01,
      onChange: ao('distanceExponent'),
    },
    distanceFallOff: {
      value: a.distanceFallOff,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: ao('distanceFallOff'),
    },
    thickness: {
      value: a.thickness,
      min: 0.01,
      max: 10,
      step: 0.01,
      onChange: ao('thickness'),
    },
    scale: {
      value: a.scale,
      min: 0.01,
      max: 2,
      step: 0.01,
      onChange: ao('scale'),
    },
    samples: {
      value: a.samples,
      min: 4,
      max: 32,
      step: 1,
      onChange: ao('samples'),
    },
    intensity: uniformControls(params)(
      'aoIntensity',
      a.intensity,
      0.01,
      4,
      0.01
    ),
    color: uniformControls(params)('aoTint', a.color),
    halfRes: { value: a.halfRes, onChange: ao('halfRes') },
    denoiseRadius: {
      value: a.denoiseRadius,
      min: 1,
      max: 12,
      step: 0.1,
      onChange: ao('denoiseRadius'),
    },
  });

  const d = CHEAP_DOF_DEFAULTS;
  const dof = uniformControls(params.dof);
  useControls('depthOfField', {
    // World units from the camera to the focal plane, and how far from it
    // the blur reaches full strength
    focusDistance: dof('focusDistance', d.focusDistance, 0, 100, 0.1),
    focusRange: dof('focusRange', d.focusRange, 1, 60, 0.5),
    // Max blur radius as a fraction of screen height
    bokehRadius: dof('bokehRadius', d.bokehRadius, 0, 0.03, 0.0005),
    // Taps per pixel: more = smoother, less noisy
    samples: dof('samples', d.samples, 4, 48, 1),
    // Green = in focus, red = fully blurred
    debugFocus: {
      value: d.debugFocus,
      onChange: v => {
        params.dof.debugFocus.value = v ? 1 : 0;
      },
    },
  });

  const b = BLOOM_DEFAULTS;
  const bloom = key => setNodeSetting('bloom', key);
  useControls('Bloom', {
    intensity: {
      value: b.intensity,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: bloom('intensity'),
    },
    radius: {
      value: b.radius,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: bloom('radius'),
    },
    luminanceThreshold: {
      value: b.threshold,
      min: 0,
      max: 5,
      step: 0.05,
      onChange: bloom('threshold'),
    },
    luminanceSmoothing: {
      value: b.smoothing,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: bloom('smoothing'),
    },
  });
};

/**
 * Renders the frame through the post-processing pipeline (pipeline.js) and
 * rebuilds it when the MSAA sample count or an effect switch changes. `irisRef`
 * receives the iris uniforms (App tweens the intro on `progress`).
 */
const PostProcessing = ({ irisRef }) => {
  const renderer = useThree(state => state.renderer);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const size = useThree(state => state.size);
  const dpr = useThree(state => state.viewport.dpr);

  // A ref, not a memo: Fast Refresh keeps refs, so a hot reload keeps the
  // iris progress and the debug controls (whose schema closes over params
  // on first render) keep writing the live uniforms
  const paramsRef = useRef(null);
  if (!paramsRef.current) paramsRef.current = createPipelineParams();
  const params = paramsRef.current;
  useLayoutEffect(() => {
    irisRef.current = params.iris;
  }, [irisRef, params]);

  // MSAA sample count of the scene pass. Changing it rebuilds the whole
  // pipeline: the pass target's sample count is fixed when the graph compiles
  const [msaa, setMsaa] = useState(COMPOSER_MSAA);

  // Per-effect switches (debug); a rebuild keeps every other setting
  const effects = useControls('Effects', EFFECTS_DEFAULTS);

  const post = useMemo(
    () =>
      createPipeline({
        renderer,
        scene,
        camera,
        samples: msaa,
        effects,
        params,
      }),
    [renderer, scene, camera, msaa, effects, params]
  );
  const postRef = useRef(post);
  postRef.current = post;

  useEffect(() => () => post.dispose(), [post]);

  // Resize-only uniforms
  useEffect(() => {
    params.resolution.value.set(size.width * dpr, size.height * dpr);
  }, [params, size, dpr]);

  useIris(params.iris, size.width / size.height);

  const experienceStarted = useStore(state => state.experienceStarted);
  useEffect(() => {
    params.dof.enabled.value = experienceStarted ? 1 : 0;
  }, [params, experienceStarted]);

  usePostProcessingControls(params, postRef);

  // MSAA A/B against SMAA-only (rebuilds the pipeline, see above)
  useControls('Antialiasing', {
    msaa: { value: COMPOSER_MSAA, options: [0, 4], onChange: setMsaa },
  });

  // A job in the 'render' phase replaces R3F's default render
  useFrame(
    () => {
      postRef.current.pipeline.render();
    },
    { phase: 'render', id: 'postProcessing' }
  );

  return null;
};

export { PostProcessing };
