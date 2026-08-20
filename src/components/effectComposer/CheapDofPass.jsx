import { useMemo } from 'react';
import { Effect, EffectAttribute } from 'postprocessing';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import cheapDofFragmentShader from '#shaders/cheapDof/fragment.glsl';

// Cheap single-pass depth of field: circle of confusion computed from the
// depth buffer around a focus distance, blurred with a Vogel-disk kernel —
// no extra render targets, in-focus pixels early-out
const CHEAP_DOF_DEFAULTS = {
  focusDistance: 0,
  focusRange: 41,
  bokehRadius: 0.003,
  samples: 16,
  debugFocus: false,
};

class CheapDofEffect extends Effect {
  constructor() {
    super('CheapDofEffect', cheapDofFragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uFocusDistance', new THREE.Uniform(CHEAP_DOF_DEFAULTS.focusDistance)],
        ['uFocusRange', new THREE.Uniform(CHEAP_DOF_DEFAULTS.focusRange)],
        ['uBokehRadius', new THREE.Uniform(CHEAP_DOF_DEFAULTS.bokehRadius)],
        ['uSamples', new THREE.Uniform(CHEAP_DOF_DEFAULTS.samples)],
        ['uDebugFocus', new THREE.Uniform(0)],
      ]),
    });
  }
}

const CheapDofPass = props => {
  const { cheapDofPassRef } = props;

  const cheapDofEffect = useMemo(() => new CheapDofEffect(), []);

  const numberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      cheapDofEffect.uniforms.get(uniform).value = v;
    },
  });

  const d = CHEAP_DOF_DEFAULTS;

  useControls(
    'depthOfField',
    {
      // World units from the camera to the focal plane, and how far from it
      // the blur reaches full strength
      focusDistance: numberControl('uFocusDistance', d.focusDistance, 0, 100, 0.1),
      focusRange: numberControl('uFocusRange', d.focusRange, 1, 60, 0.5),
      // Max blur radius as a fraction of screen height
      bokehRadius: numberControl('uBokehRadius', d.bokehRadius, 0, 0.03, 0.0005),
      // Taps per pixel: more = smoother, less noisy
      samples: numberControl('uSamples', d.samples, 4, 48, 1),
      // Green = in focus, red = fully blurred
      debugFocus: {
        value: d.debugFocus,
        onChange: v => {
          cheapDofEffect.uniforms.get('uDebugFocus').value = v ? 1 : 0;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return <primitive ref={cheapDofPassRef} object={cheapDofEffect} />;
};

export { CheapDofPass };
