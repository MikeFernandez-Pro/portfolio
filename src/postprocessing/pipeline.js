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

import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { cheapDof, createCheapDofUniforms } from './cheapDof.js';
import { createIrisUniforms, iris } from './Iris.jsx';

const AO_ENABLED = !IS_MOBILE_DEVICE;
const DOF_ENABLED = !IS_MOBILE_DEVICE;

export const AO_DEFAULTS = {
  // View-space radius of the horizon search
  radius: 1,
  distanceExponent: 1,
  distanceFallOff: 1,
  thickness: 1,
  scale: 1,
  samples: 16,
  // occlusion^intensity
  intensity: 1.5,
  // Occluded areas darken toward this color instead of black
  color: '#bce3ff',
  halfRes: true,
  denoiseRadius: 5,
};

export const BLOOM_DEFAULTS = {
  intensity: 2,
  radius: 0.85,
  threshold: 2,
  smoothing: 1,
};

/**
 * Inputs that outlive a pipeline rebuild (MSAA or effect switch): uniforms
 * shared by every build, plus the values of the GTAO and bloom nodes, which
 * a rebuild recreates (applied by applyNodeSettings).
 */
export const createPipelineParams = () => ({
  resolution: uniform(new THREE.Vector2(1, 1)),
  aoIntensity: uniform(AO_DEFAULTS.intensity),
  aoTint: uniform(new THREE.Color(AO_DEFAULTS.color)),
  dof: createCheapDofUniforms(),
  iris: createIrisUniforms(),
  ao: { ...AO_DEFAULTS },
  bloom: { ...BLOOM_DEFAULTS },
});

// Writes the node-owned settings into a pipeline's GTAO and bloom nodes
export const applyNodeSettings = (post, params) => {
  if (post.aoPass) {
    const s = params.ao;
    post.aoPass.radius.value = s.radius;
    post.aoPass.distanceExponent.value = s.distanceExponent;
    post.aoPass.distanceFallOff.value = s.distanceFallOff;
    post.aoPass.thickness.value = s.thickness;
    post.aoPass.scale.value = s.scale;
    post.aoPass.samples.value = s.samples;
    post.aoPass.resolutionScale = s.halfRes ? 0.5 : 1;
    post.denoisePass.radius.value = s.denoiseRadius;
  }
  if (post.bloomPass) {
    const s = params.bloom;
    post.bloomPass.strength.value = s.intensity;
    post.bloomPass.radius.value = s.radius;
    post.bloomPass.threshold.value = s.threshold;
    post.bloomPass.smoothWidth.value = s.smoothing;
  }
};

/**
 * Post-processing graph, in order: AO (desktop) → cheap DoF (desktop) →
 * bloom → vignette → ACES tone mapping + sRGB → iris → SMAA. Each RTT step
 * is one fullscreen pass. `effects` switches the optional ones
 * (EFFECTS_DEFAULTS keys); `params` comes from createPipelineParams.
 */
export const createPipeline = ({
  renderer,
  scene,
  camera,
  samples,
  effects,
  params,
}) => {
  const pipeline = new THREE.RenderPipeline(renderer);
  // Tone mapping / color space are applied by hand below: the iris and
  // SMAA must run after them
  pipeline.outputColorTransform = false;

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
  let aoPass = null;
  let denoisePass = null;
  if (AO_ENABLED && effects.ambientOcclusion) {
    aoPass = own(ao(sceneDepth, null, camera));
    denoisePass = own(
      denoise(aoPass.getTextureNode(), sceneDepth, null, camera)
    );
    const occlusion = pow(denoisePass.r, params.aoIntensity);
    color = own(
      convertToTexture(
        vec4(
          sceneColor.rgb.mul(mix(params.aoTint, vec3(1), occlusion)),
          sceneColor.a
        )
      )
    );
  }

  if (DOF_ENABLED && effects.depthOfField) {
    const dof = cheapDof({
      colorNode: color,
      depthNode: sceneDepth,
      camera,
      resolution: params.resolution,
      uniforms: params.dof,
    });
    color = own(convertToTexture(dof));
  }

  let bloomPass = null;
  let hdr = color;
  if (effects.bloom) {
    bloomPass = own(bloom(color));
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

  // Iris after bloom on purpose: the mask must also cover the glow, or
  // bright emissives bleed onto the unrevealed black. Before SMAA so the
  // contour gets AA'd. SMAA after tone mapping (it wants LDR); its input is
  // converted to a texture here so that render target can be disposed too
  const revealed = iris(params.iris)(ldr);
  pipeline.outputNode = effects.smaa
    ? own(smaa(own(convertToTexture(revealed))))
    : revealed;

  const post = {
    pipeline,
    aoPass,
    denoisePass,
    bloomPass,
    dispose: () => {
      pipeline.dispose();
      owned.forEach(node => node.dispose());
    },
  };
  applyNodeSettings(post, params);
  return post;
};
