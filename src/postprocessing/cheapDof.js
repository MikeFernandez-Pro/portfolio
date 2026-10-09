import {
  Fn,
  If,
  Loop,
  PI2,
  abs,
  cos,
  float,
  int,
  max,
  mix,
  select,
  perspectiveDepthToViewZ,
  sin,
  smoothstep,
  sqrt,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl';
import { hash12 } from '#shaders/includes/hash.js';

// Cheap single-pass depth of field: circle of confusion computed from the
// depth buffer around a focus distance, blurred with a Vogel-disk kernel —
// in-focus pixels early-out
export const CHEAP_DOF_DEFAULTS = {
  focusDistance: 0,
  focusRange: 41,
  bokehRadius: 0.003,
  samples: 8,
  debugFocus: false,
};

const GOLDEN_ANGLE = 2.399963229728653;

// Created once and shared by every pipeline build
export const createCheapDofUniforms = () => ({
  enabled: uniform(1),
  focusDistance: uniform(CHEAP_DOF_DEFAULTS.focusDistance),
  focusRange: uniform(CHEAP_DOF_DEFAULTS.focusRange),
  bokehRadius: uniform(CHEAP_DOF_DEFAULTS.bokehRadius),
  samples: uniform(CHEAP_DOF_DEFAULTS.samples),
  debugFocus: uniform(0),
});

/**
 * Builds the DoF node. `colorNode` / `depthNode` are texture nodes (the scene
 * pass outputs), sampled around each pixel; `resolution` is the drawing
 * buffer size in pixels.
 */
export const cheapDof = ({
  colorNode,
  depthNode,
  camera,
  resolution,
  uniforms,
}) => {
  const cameraNear = uniform(camera.near).onRenderUpdate(() => camera.near);
  const cameraFar = uniform(camera.far).onRenderUpdate(() => camera.far);

  const sceneDistance = tapUv =>
    perspectiveDepthToViewZ(
      depthNode.sample(tapUv).r,
      cameraNear,
      cameraFar
    ).negate();

  // Circle of confusion: 0 at the focal plane, 1 once focusRange world units
  // away from it
  const cocFromDistance = dist =>
    smoothstep(0, uniforms.focusRange, abs(dist.sub(uniforms.focusDistance)));

  const node = Fn(() => {
    const uvNode = uv();
    const inputColor = colorNode.sample(uvNode);
    // Clamp: negative/NaN RGB must not reach bloom's mip chain
    const outputColor = vec4(max(inputColor.rgb, 0), inputColor.a).toVar();

    If(uniforms.enabled.greaterThan(0.5), () => {
      const centerDist = sceneDistance(uvNode).toVar();
      const centerCoC = cocFromDistance(centerDist).toVar();

      // CoC visualization for tuning: green = in focus, red = fully blurred
      If(uniforms.debugFocus.greaterThan(0.5), () => {
        outputColor.assign(mix(vec4(0, 1, 0, 1), vec4(1, 0, 0, 1), centerCoC));
      }).ElseIf(centerCoC.greaterThanEqual(0.01), () => {
        // Vogel/golden-angle spiral disk blur, rotated per pixel to hide the
        // spiral pattern; radius in fractions of screen height
        const radius = centerCoC.mul(uniforms.bokehRadius);
        const aspectCorrection = vec2(resolution.y.div(resolution.x), 1);
        const phi = hash12(uvNode.mul(resolution)).mul(PI2);

        const acc = vec4(inputColor).toVar();
        const weightSum = float(1).toVar();

        Loop(int(uniforms.samples), ({ i }) => {
          const fi = float(i);
          const r = sqrt(fi.add(0.5).div(uniforms.samples));
          const theta = fi.mul(GOLDEN_ANGLE).add(phi);
          const tapUv = uvNode.add(
            vec2(cos(theta), sin(theta))
              .mul(r)
              .mul(radius)
              .mul(aspectCorrection)
          );

          // Scatter-as-gather: taps behind the center pixel inherit its CoC,
          // taps in front use their own — keeps sharp foreground from
          // bleeding over blurred background while blurred foreground still
          // spills over sharp areas
          const tapDist = sceneDistance(tapUv);
          const w = select(
            tapDist.greaterThan(centerDist),
            centerCoC,
            max(cocFromDistance(tapDist), 0.1)
          );

          acc.addAssign(colorNode.sample(tapUv).mul(w));
          weightSum.addAssign(w);
        });

        const blurred = acc.div(weightSum);
        outputColor.assign(vec4(max(blurred.rgb, 0), blurred.a));
      });
    });

    return outputColor;
  })();

  return node;
};
