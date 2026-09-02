import { useEffect, useRef, useState } from 'react';

import { DEBUG_ENABLED } from '#utils/debug.js';
import { useTweakpaneControls } from '#utils/tweakpaneControls.jsx';

/**
 * useControls facade. With DEBUG_ENABLED the Tweakpane implementation runs
 * (tweakpaneControls.jsx); without it the headless version below takes over —
 * no pane, no DOM, and tweakpane tree-shaken from the bundle. It keeps the
 * two behaviors call sites functionally rely on:
 * - every `onChange` fires once with its schema value after mount — that's
 *   what initializes shader uniforms, light params and sound volumes
 * - keys without `onChange` come back as state, fixed at their schema values
 * Buttons (bare functions) and min/max/step only matter to the panel, so
 * they're ignored here.
 */

const hasConfig = def =>
  def !== null &&
  typeof def === 'object' &&
  !Array.isArray(def) &&
  'value' in def;

const useHeadlessControls = (folderName, schema) => {
  // Captured on first render, like the panel version
  const schemaRef = useRef(schema);

  const [values] = useState(() => {
    const initial = {};
    for (const [key, def] of Object.entries(schemaRef.current)) {
      if (typeof def === 'function') continue; // button, panel-only
      if (hasConfig(def)) {
        if (def.onChange) continue; // transient, not part of the state
        initial[key] = def.value;
      } else {
        initial[key] = def;
      }
    }
    return initial;
  });

  useEffect(() => {
    // Same timing as the panel version: onChange fires once with the initial
    // value after mount
    for (const def of Object.values(schemaRef.current)) {
      if (hasConfig(def) && def.onChange) def.onChange(def.value);
    }
  }, []);

  return values;
};

const useControls = DEBUG_ENABLED ? useTweakpaneControls : useHeadlessControls;

export { useControls };
