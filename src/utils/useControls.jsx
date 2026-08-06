import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

/**
 * Drop-in replacement for leva's `useControls(folderName, schema, options)`,
 * backed by Tweakpane. Mirrors the leva behaviors this codebase relies on:
 * - keys with `onChange` are transient: excluded from the returned state and
 *   fired once with the initial value after mount, then on every change
 * - keys without `onChange` live in state and trigger a re-render on change
 * - `{ collapsed: true }` collapses the folder
 * - supports numbers (with/without min/max/step), hex color strings, booleans,
 *   `options` selects, THREE.Vector2-like values and [x, y, z] arrays
 */

// Survives HMR module re-evaluation so folders don't duplicate
const getPane = () => {
  if (!globalThis.__debugPane) {
    const pane = new Pane({ title: 'Debug' });
    const root = pane.element.parentElement;
    if (root) {
      root.style.zIndex = '1000';
    }
    globalThis.__debugPane = pane;
  }
  return globalThis.__debugPane;
};

const AXES = ['x', 'y', 'z', 'w'];

const hasConfig = def =>
  def !== null &&
  typeof def === 'object' &&
  !Array.isArray(def) &&
  'value' in def;

const isVectorLike = value =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.x === 'number' &&
  typeof value.y === 'number';

// Leva shows sliders with a sensible step even when none is given; without
// this, integer-ish values (e.g. particle counts) would become floats
const inferStep = (min, max) => {
  if (typeof min !== 'number' || typeof max !== 'number') return undefined;
  const range = max - min;
  if (!(range > 0)) return undefined;
  const rough = range / 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  return Math.round(rough / magnitude) * magnitude;
};

const useControls = (folderName, schema, options = {}) => {
  // Schema and options are captured on first render, like leva
  const schemaRef = useRef(schema);
  const optionsRef = useRef(options);

  const [values, setValues] = useState(() => {
    const initial = {};
    for (const [key, def] of Object.entries(schemaRef.current)) {
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
    const folder = getPane().addFolder({
      title: folderName,
      expanded: !optionsRef.current.collapsed,
    });

    const params = {};

    for (const [key, def] of Object.entries(schemaRef.current)) {
      const config = hasConfig(def) ? def : { value: def };
      const { value, min, max, step, options: choices, onChange } = config;

      const bindingOptions = {};
      let kind = 'primitive';

      if (Array.isArray(value)) {
        kind = 'array';
        const axes = AXES.slice(0, value.length);
        params[key] = Object.fromEntries(
          axes.map((axis, index) => [axis, value[index]])
        );
        axes.forEach(axis => {
          bindingOptions[axis] = { min, max, step };
        });
      } else if (isVectorLike(value)) {
        kind = 'vector';
        const axes = typeof value.z === 'number' ? AXES.slice(0, 3) : AXES.slice(0, 2);
        params[key] = Object.fromEntries(axes.map(axis => [axis, value[axis]]));
        axes.forEach(axis => {
          bindingOptions[axis] = { min, max, step };
        });
      } else {
        params[key] = value;
        if (min !== undefined) bindingOptions.min = min;
        if (max !== undefined) bindingOptions.max = max;
        const resolvedStep =
          step ?? (typeof value === 'number' ? inferStep(min, max) : undefined);
        if (resolvedStep !== undefined) bindingOptions.step = resolvedStep;
        if (choices) {
          bindingOptions.options = Array.isArray(choices)
            ? Object.fromEntries(choices.map(choice => [String(choice), choice]))
            : choices;
        }
      }

      const binding = folder.addBinding(params, key, bindingOptions);

      binding.on('change', event => {
        let next;
        if (kind === 'array') {
          next = AXES.slice(0, value.length).map(axis => event.value[axis]);
        } else if (kind === 'vector') {
          // Mutate the original vector instance (e.g. THREE.Vector2) so
          // consumers holding a reference keep seeing fresh values
          for (const axis of Object.keys(params[key])) {
            value[axis] = event.value[axis];
          }
          next = value;
        } else {
          next = event.value;
        }

        if (onChange) {
          onChange(next);
        } else {
          setValues(previous => ({ ...previous, [key]: next }));
        }
      });

      // leva fires onChange once with the initial value after mount
      if (onChange) {
        onChange(value);
      }
    }

    return () => {
      folder.dispose();
    };
  }, []);

  return values;
};

export { useControls };
