import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { useStore } from '#store';

import {
  AO_DEFAULTS,
  AO_ENABLED,
  BLOOM_DEFAULTS,
  DOF_ENABLED,
  applyNodeSetting,
  createPipeline,
  createPipelineParams,
} from './pipeline.js';
import { CHEAP_DOF_DEFAULTS } from './cheapDof.js';
import { useIris } from './useIris.js';
import { MAX_DPR, QualityGovernor, qualityLadder } from './quality.js';

// Antialiasing: 4x MSAA on the scene pass (desktop) + SMAA ULTRA after tone
// mapping; mobile is SMAA-only. The debug "Antialiasing" msaa control
// rebuilds the pipeline for A/B. MSAA extrapolates varyings past their
// vertex range on thin geometry and TSL has no centroid sampling: anything
// fed into a mix/threshold there is clamped (lantern, grass)
const COMPOSER_MSAA = IS_MOBILE_DEVICE ? 0 : 4;

// Quality steps from the whole look down (quality.js). Phones already start
// without MSAA, DoF and AO: their only step is the pixel ratio
const QUALITY_STEPS = qualityLadder({
  msaa: COMPOSER_MSAA,
  dof: DOF_ENABLED,
  ao: AO_ENABLED,
  dpr: MAX_DPR,
});

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
 * rebuilds it when the MSAA sample count, an effect switch or the quality
 * step changes. `irisRef` receives the iris uniforms (App tweens the intro on
 * `progress`); `setDpr` sets the Canvas pixel ratio of the quality step.
 */
const PostProcessing = ({ irisRef, setDpr }) => {
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

  // Quality step (quality.js): the governor moves it by the frame times once
  // the experience starts. Debug pauses it by default (adapt) so it doesn't
  // fight the switches below; `step` then picks one by hand
  const [level, setLevel] = useState(0);
  const step = QUALITY_STEPS[level];
  const quality = useControls('Quality', {
    adapt: !DEBUG_ENABLED,
    step: {
      value: 0,
      min: 0,
      max: QUALITY_STEPS.length - 1,
      step: 1,
      onChange: setLevel,
    },
  });
  const governorRef = useRef(null);
  const experienceStarted = useStore(state => state.experienceStarted);
  useFrame((_, delta) => {
    if (!quality.adapt || !experienceStarted) return;
    const now = performance.now();
    // Created on the first judged frame: the loading and the precompile
    // frames are not the device's pace
    governorRef.current ??= new QualityGovernor(QUALITY_STEPS, level, now);
    if (governorRef.current.frame(delta * 1000, now)) {
      setLevel(governorRef.current.level);
    }
  });
  useEffect(() => setDpr(step.dpr), [setDpr, step.dpr]);

  // MSAA sample count of the scene pass, capped by the quality step.
  // Changing it rebuilds the whole pipeline: the pass target's sample count
  // is fixed when the graph compiles
  const [msaaControl, setMsaa] = useState(COMPOSER_MSAA);
  const msaa = Math.min(msaaControl, step.msaa);

  // Per-effect switches (debug) and the quality step: AO and DoF draw only
  // when both allow them; a rebuild keeps every other setting
  const effectControls = useControls('Effects', EFFECTS_DEFAULTS);
  const effects = useMemo(
    () => ({
      ...effectControls,
      ambientOcclusion: effectControls.ambientOcclusion && step.ao,
      depthOfField: effectControls.depthOfField && step.dof,
    }),
    [effectControls, step]
  );

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

  useEffect(() => {
    params.dof.enabled.value = experienceStarted ? 1 : 0;
  }, [params, experienceStarted]);

  usePostProcessingControls(params, postRef);

  // MSAA on/off, for A/B (rebuilds the pipeline)
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
