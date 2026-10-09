import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import {
  convertToTexture,
  distance,
  ivec2,
  mix,
  pass,
  pow,
  renderOutput,
  rtt,
  screenCoordinate,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { useControls } from '#debug/useControls.jsx';

import { createCheapDof, useCheapDofControls } from './CheapDofPass.jsx';
import { createIris, useIris } from './Iris.jsx';
import {
  IS_MOBILE_DEVICE,
  IS_PHOTO_MODE,
  COMPOSER_MSAA,
} from '#utils/utils.js';
import { useStore } from '#store';

const AO_ENABLED = !IS_MOBILE_DEVICE;
const DOF_ENABLED = !IS_MOBILE_DEVICE && !IS_PHOTO_MODE;

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

/**
 * Post-processing graph, in order: AO (desktop) → cheap DoF (desktop, not in
 * photo mode) → bloom → vignette → ACES tone mapping + sRGB → scene revealer
 * → SMAA. Each RTT step is one fullscreen pass. `effects` switches the
 * optional ones (EFFECTS_DEFAULTS keys).
 */
const createPipeline = ({ renderer, scene, camera, samples, effects }) => {
  const pipeline = new THREE.RenderPipeline(renderer);
  // Tone mapping / color space are applied by hand below: the revealer and
  // SMAA must run after them
  pipeline.outputColorTransform = false;

  const resolution = uniform(new THREE.Vector2(1, 1));

  // Every node owning render targets: RenderPipeline.dispose() only frees its
  // own quad, so a rebuild (MSAA switch, HMR) disposes these explicitly
  const owned = [];
  const own = node => {
    owned.push(node);
    return node;
  };

  const scenePass = own(pass(scene, camera, { samples }));
  const sceneColor = scenePass.getTextureNode('output');
  const passDepth = scenePass.getTextureNode('depth');

  // With MSAA the pass depth is a multisampled texture, which only
  // textureLoad can read (three doesn't resolve depth): copy sample 0 into a
  // plain float texture for the AO, the denoise and the DoF
  const sceneDepth =
    samples > 1
      ? own(
          rtt(passDepth.load(ivec2(screenCoordinate.xy)), null, null, {
            type: THREE.FloatType,
            format: THREE.RedFormat,
            depthBuffer: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
          })
        )
      : passDepth;

  let color = sceneColor;

  // Ambient occlusion: GTAO at half resolution, normals rebuilt from depth
  // (no MRT normal attachment), then an edge-aware denoise. Applied before
  // the DoF so the blur taps see occluded color
  let aoNodes = null;
  if (AO_ENABLED && effects.ambientOcclusion) {
    const aoPass = own(ao(sceneDepth, null, camera));
    aoPass.resolutionScale = 0.5;
    const denoisePass = own(
      denoise(aoPass.getTextureNode(), sceneDepth, null, camera)
    );
    const intensity = uniform(1.5);
    const tint = uniform(new THREE.Color('#bce3ff'));
    const occlusion = pow(denoisePass.r, intensity);
    color = own(
      convertToTexture(
        vec4(sceneColor.rgb.mul(mix(tint, vec3(1), occlusion)), sceneColor.a)
      )
    );
    aoNodes = { aoPass, denoisePass, intensity, tint };
  }

  let dof = null;
  if (DOF_ENABLED && effects.depthOfField) {
    dof = createCheapDof({
      colorNode: color,
      depthNode: sceneDepth,
      camera,
      resolution,
    });
    color = own(convertToTexture(dof.node));
  }

  let bloomPass = null;
  let hdr = color;
  if (effects.bloom) {
    bloomPass = own(bloom(color, 2, 0.85, 2));
    bloomPass.smoothWidth.value = 1;
    hdr = color.add(bloomPass);
  }

  // Same falloff as postprocessing's default Vignette (offset 0.5, darkness 0.5)
  // (edges in increasing order: WGSL leaves smoothstep(high, low) undefined)
  const vignette = smoothstep(
    0.3995,
    0.8,
    distance(uv(), vec2(0.5))
  ).oneMinus();
  const vignetted = effects.vignette ? vec4(hdr.rgb.mul(vignette), hdr.a) : hdr;

  const ldr = renderOutput(
    vignetted,
    THREE.ACESFilmicToneMapping,
    THREE.SRGBColorSpace
  );

  // After bloom on purpose: the mask must also cover the glow, or bright
  // emissives bleed onto the unrevealed black. Before SMAA so the contour
  // gets AA'd
  const revealer = createIris();

  // SMAA after tone mapping (it wants LDR). Its input is converted to a
  // texture here so that render target can be disposed too
  const revealed = revealer.apply(ldr);
  pipeline.outputNode = effects.smaa
    ? own(smaa(own(convertToTexture(revealed))))
    : revealed;

  const dispose = () => {
    pipeline.dispose();
    owned.forEach(node => node.dispose());
  };

  return {
    pipeline,
    scenePass,
    resolution,
    aoNodes,
    dof,
    bloomPass,
    revealer,
    dispose,
  };
};

// Debug-panel values, by key. Kept outside the pipeline so a rebuild
// (MSAA switch) starts from the current settings, not the defaults
const SETTERS = {
  aoRadius: (p, v) => p.aoNodes && (p.aoNodes.aoPass.radius.value = v),
  aoDistanceExponent: (p, v) =>
    p.aoNodes && (p.aoNodes.aoPass.distanceExponent.value = v),
  aoDistanceFallOff: (p, v) =>
    p.aoNodes && (p.aoNodes.aoPass.distanceFallOff.value = v),
  aoThickness: (p, v) => p.aoNodes && (p.aoNodes.aoPass.thickness.value = v),
  aoScale: (p, v) => p.aoNodes && (p.aoNodes.aoPass.scale.value = v),
  aoSamples: (p, v) => p.aoNodes && (p.aoNodes.aoPass.samples.value = v),
  aoIntensity: (p, v) => p.aoNodes && (p.aoNodes.intensity.value = v),
  aoColor: (p, v) => p.aoNodes && p.aoNodes.tint.value.set(v),
  aoHalfRes: (p, v) =>
    p.aoNodes && (p.aoNodes.aoPass.resolutionScale = v ? 0.5 : 1),
  aoDenoiseRadius: (p, v) =>
    p.aoNodes && (p.aoNodes.denoisePass.radius.value = v),
  bloomIntensity: (p, v) => p.bloomPass && (p.bloomPass.strength.value = v),
  bloomRadius: (p, v) => p.bloomPass && (p.bloomPass.radius.value = v),
  bloomThreshold: (p, v) => p.bloomPass && (p.bloomPass.threshold.value = v),
  bloomSmoothing: (p, v) => p.bloomPass && (p.bloomPass.smoothWidth.value = v),
};

const applySetting = (post, key, value) => {
  if (key.startsWith('dof.')) {
    if (post.dof) post.dof.uniforms[key.slice(4)].value = value;
  } else {
    SETTERS[key](post, value);
  }
};

const EffectComposer = props => {
  const { sceneRevealerRef } = props;

  const renderer = useThree(state => state.renderer);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const size = useThree(state => state.size);
  const dpr = useThree(state => state.viewport.dpr);

  // MSAA sample count of the scene pass. Changing it rebuilds the whole
  // pipeline: the pass target's sample count is fixed when the graph compiles
  const [msaa, setMsaa] = useState(COMPOSER_MSAA);

  // Per-effect switches (debug); the same rebuild keeps every other setting
  const effects = useControls('Effects', EFFECTS_DEFAULTS);
  const {
    ambientOcclusion,
    depthOfField,
    bloom: bloomOn,
    vignette,
    smaa: smaaOn,
  } = effects;

  const post = useMemo(
    () =>
      createPipeline({
        renderer,
        scene,
        camera,
        samples: msaa,
        effects: {
          ambientOcclusion,
          depthOfField,
          bloom: bloomOn,
          vignette,
          smaa: smaaOn,
        },
      }),
    [
      renderer,
      scene,
      camera,
      msaa,
      ambientOcclusion,
      depthOfField,
      bloomOn,
      vignette,
      smaaOn,
    ]
  );
  const postRef = useRef(post);
  postRef.current = post;

  useEffect(() => () => post.dispose(), [post]);

  const settingsRef = useRef({});
  const bind = key => value => {
    settingsRef.current[key] = value;
    applySetting(postRef.current, key, value);
  };
  useLayoutEffect(() => {
    const settings = settingsRef.current;
    for (const key in settings) applySetting(post, key, settings[key]);
  }, [post]);

  // App drives the intro iris through this ref (gsap on progress.value).
  // A rebuild carries the current progress over
  const previousRevealer = sceneRevealerRef.current;
  if (previousRevealer && previousRevealer !== post.revealer.uniforms) {
    post.revealer.uniforms.progress.value = previousRevealer.progress.value;
  }
  sceneRevealerRef.current = post.revealer.uniforms;

  // Resize-only uniforms
  useEffect(() => {
    post.resolution.value.set(size.width * dpr, size.height * dpr);
  }, [post, size, dpr]);

  useIris(post.revealer, size.width / size.height);

  const experienceStarted = useStore(state => state.experienceStarted);
  useEffect(() => {
    if (post.dof) post.dof.uniforms.enabled.value = experienceStarted ? 1 : 0;
  }, [post, experienceStarted]);

  useControls('Ambient Occlusion', {
    // View-space radius of the horizon search
    radius: {
      value: 1,
      min: 0.01,
      max: 4,
      step: 0.01,
      onChange: bind('aoRadius'),
    },
    distanceExponent: {
      value: 1,
      min: 1,
      max: 4,
      step: 0.01,
      onChange: bind('aoDistanceExponent'),
    },
    distanceFallOff: {
      value: 1,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: bind('aoDistanceFallOff'),
    },
    thickness: {
      value: 1,
      min: 0.01,
      max: 10,
      step: 0.01,
      onChange: bind('aoThickness'),
    },
    scale: {
      value: 1,
      min: 0.01,
      max: 2,
      step: 0.01,
      onChange: bind('aoScale'),
    },
    samples: {
      value: 16,
      min: 4,
      max: 32,
      step: 1,
      onChange: bind('aoSamples'),
    },
    // occlusion^intensity
    intensity: {
      value: 1.5,
      min: 0.01,
      max: 4,
      step: 0.01,
      onChange: bind('aoIntensity'),
    },
    // Occluded areas darken toward this color instead of black
    color: { value: '#bce3ff', onChange: bind('aoColor') },
    halfRes: { value: true, onChange: bind('aoHalfRes') },
    denoiseRadius: {
      value: 5,
      min: 1,
      max: 12,
      step: 0.1,
      onChange: bind('aoDenoiseRadius'),
    },
  });

  useCheapDofControls(name => bind(`dof.${name}`));

  useControls('Bloom', {
    intensity: {
      value: 2,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: bind('bloomIntensity'),
    },
    radius: {
      value: 0.85,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: bind('bloomRadius'),
    },
    luminanceThreshold: {
      value: 2,
      min: 0,
      max: 5,
      step: 0.05,
      onChange: bind('bloomThreshold'),
    },
    luminanceSmoothing: {
      value: 1,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: bind('bloomSmoothing'),
    },
  });

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

export { EffectComposer };
