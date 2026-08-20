import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

import { IS_PHOTO_MODE } from '#utils/utils.js';

/**
 * Drop-in replacement for leva's `useControls(folderName, schema, options)`,
 * backed by Tweakpane. Mirrors the leva behaviors this codebase relies on:
 * - keys with `onChange` are transient: excluded from the returned state and
 *   fired once with the initial value after mount, then on every change
 * - keys without `onChange` live in state and trigger a re-render on change
 * - `{ collapsed: true }` collapses the folder
 * - supports numbers (with/without min/max/step), hex color strings, booleans,
 *   `options` selects, THREE.Vector2-like values and [x, y, z] arrays
 * - every folder gets a Reset button restoring its controls to their schema
 *   values (re-firing onChange / state updates accordingly); group folders
 *   reset all their subfolders. The old `{ reset: true }` option is implied
 */

// Debug folder hierarchy, in display order. `null` marks a folder that a
// useControls call fills with bindings; a nested object is a group. Titles
// must match the folderName passed at call sites; any title not listed here
// keeps today's behavior: its own folder at the root, in mount order.
const FOLDER_TREE = {
  Postprocessing: { depthOfField: null, 'Ambient Occlusion': null },
  Sky: { Background: null, Stars: null },
  WorldLight: {
    directionalLight: null,
    ambientLight: null,
  },
  NatureEffects: { 'Wind Lines': null, 'Cloud Shadows': null },
  Grass: null,
  Spawn: { 'Respawn Animation': null, SpawnLight: null, Controls: null },
  Torches: {
    Torches: null,
    TorchLights: null,
    TorchesSparks: null,
    TorchesSmoke: null,
  },
  Well: { Well: null, WellLight: null },
  Lanterns: { Lanterns: null, LanternLights: null, FireFlies: null },
  Forge: {
    ForgeSparks: null,
    Sword: { ForgeSword: null, SwordLight: null },
    ForgeLava: { ForgeLava: null, ForgeLavaLight: null },
    Window: { WindowRay: null, WindowLight: null },
  },
  Contact: { XSign: null, EmailSign: null },
  ProjectsPortal: {
    ProjectsPortal: null,
    PortalLight: null,
    PortalSparks: null,
  },
  ProjectsPlates: { Plates: null, PlatesLight: null },
  Cauldron: {
    CauldronLiquid: null,
    CauldronBubbles: null,
    CauldronLight: null,
    CauldronSmoke: null,
  },
  SkillsPortal: { Skills: null, SkillsPortalLight: null },
};

// Extra titles funneled into another leaf's folder: their bindings merge
// flat into it instead of getting a folder of their own
const FOLDER_MERGES = {
  Wind: ['Grass'],
  Repulse: ['Grass'],
  'Shadow Camera': ['WorldLight', 'directionalLight'],
};

// Call-site title -> path of the folder its bindings land in
const FOLDER_PATHS = { ...FOLDER_MERGES };
const collectFolderPaths = (tree, parentPath) => {
  for (const [title, children] of Object.entries(tree)) {
    const path = [...parentPath, title];
    if (children === null) {
      FOLDER_PATHS[title] = path;
    } else {
      collectFolderPaths(children, path);
    }
  }
};
collectFolderPaths(FOLDER_TREE, []);

// Per-folder reset state: the registered resetter functions of every hook
// attached to the folder, and the folder's single shared Reset button.
// Keyed on the folder instances (which survive HMR via globalThis), so the
// registry lives there too
const getFolderResetState = folder => {
  if (!globalThis.__debugFolderResets) {
    globalThis.__debugFolderResets = new WeakMap();
  }
  const registry = globalThis.__debugFolderResets;
  let state = registry.get(folder);
  if (!state) {
    state = { resetters: new Set(), button: null };
    registry.set(folder, state);
  }
  return state;
};

// Group folders reset everything inside them: own hooks (if any) plus every
// descendant folder's. Buttons have no `children`, so they're skipped
const runFolderReset = folder => {
  getFolderResetState(folder).resetters.forEach(reset => reset());
  folder.children?.forEach(child => {
    if (child.children) runFolderReset(child);
  });
};

// Survives HMR module re-evaluation so folders don't duplicate
const getPane = () => {
  if (!globalThis.__debugPane) {
    const pane = new Pane({ title: 'Debug' });
    const root = pane.element.parentElement;
    // Controls still register (their initial onChange calls set up uniforms),
    // the panel is just never shown in photo mode
    if (root && IS_PHOTO_MODE) root.style.display = 'none';
    if (root) {
      root.style.zIndex = '1000';
      // Keep the panel usable when folders overflow the viewport
      root.style.maxHeight = 'calc(100vh - 16px)';
      root.style.overflowY = 'auto';
      root.style.overscrollBehavior = 'contain';
    }
    // Pre-create the whole hierarchy so groups keep their declared order
    // regardless of component mount order
    const folders = new Map();
    const buildFolders = (tree, parentPath, parentFolder) => {
      for (const [title, children] of Object.entries(tree)) {
        const path = [...parentPath, title];
        const folder = parentFolder.addFolder({ title, expanded: false });
        folders.set(path.join('/'), folder);
        if (children !== null) {
          buildFolders(children, path, folder);
          // Group folders reset all their subfolders at once (leaf folders
          // get their own button when a hook attaches)
          folder
            .addButton({ title: 'Reset' })
            .on('click', () => runFolderReset(folder));
        }
      }
    };
    buildFolders(FOLDER_TREE, [], pane);
    globalThis.__debugFolders = folders;
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
  // Folder name, schema and options are captured on first render, like leva
  const folderNameRef = useRef(folderName);
  const schemaRef = useRef(schema);
  const optionsRef = useRef(options);

  const [values, setValues] = useState(() => {
    const initial = {};
    for (const [key, def] of Object.entries(schemaRef.current)) {
      if (typeof def === 'function') continue; // button, not part of the state
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
    const pane = getPane();
    const path = FOLDER_PATHS[folderNameRef.current];
    // Grouped titles attach to their pre-created folder (possibly shared with
    // other hooks, e.g. Grass/Wind/Repulse); unknown titles get their own
    // root folder as before
    const sharedFolder = path
      ? globalThis.__debugFolders?.get(path.join('/'))
      : null;
    const folder =
      sharedFolder ??
      pane.addFolder({
        title: folderNameRef.current,
        expanded: !optionsRef.current.collapsed,
      });
    if (sharedFolder) {
      sharedFolder.expanded = !optionsRef.current.collapsed;
    }

    const params = {};
    const resetters = [];
    // Bindings/buttons this hook added, removed one by one on cleanup when
    // the folder is shared and must survive the hook
    const added = [];

    for (const [key, def] of Object.entries(schemaRef.current)) {
      // A bare function becomes a click button (e.g. Play / Reset actions)
      if (typeof def === 'function') {
        const button = folder.addButton({ title: key });
        button.on('click', def);
        added.push(button);
        continue;
      }

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
      added.push(binding);

      const applyValue = raw => {
        let next;
        if (kind === 'array') {
          next = AXES.slice(0, value.length).map(axis => raw[axis]);
        } else if (kind === 'vector') {
          // Mutate the original vector instance (e.g. THREE.Vector2) so
          // consumers holding a reference keep seeing fresh values
          for (const axis of Object.keys(params[key])) {
            value[axis] = raw[axis];
          }
          next = value;
        } else {
          next = raw;
        }

        if (onChange) {
          onChange(next);
        } else {
          setValues(previous => ({ ...previous, [key]: next }));
        }
      };

      binding.on('change', event => applyValue(event.value));

      // Snapshot now: vector params get mutated in place on change, so a
      // late copy would capture the current value instead of the default
      const initialParam =
        params[key] !== null && typeof params[key] === 'object'
          ? { ...params[key] }
          : params[key];
      resetters.push(() => {
        if (initialParam !== null && typeof initialParam === 'object') {
          Object.assign(params[key], initialParam);
        } else {
          params[key] = initialParam;
        }
        binding.refresh();
        applyValue(params[key]);
      });

      // leva fires onChange once with the initial value after mount
      if (onChange) {
        onChange(value);
      }
    }

    // Every folder gets a Reset button restoring its controls to the schema
    // values. Hooks merged into the same folder share one button, re-created
    // on attach so it stays last
    const resetState = getFolderResetState(folder);
    resetters.forEach(reset => resetState.resetters.add(reset));
    if (resetState.button) folder.remove(resetState.button);
    resetState.button = folder.addButton({ title: 'Reset' });
    resetState.button.on('click', () =>
      resetState.resetters.forEach(reset => reset())
    );

    return () => {
      resetters.forEach(reset => resetState.resetters.delete(reset));
      if (sharedFolder) {
        // The folder belongs to the pre-created hierarchy (and may hold other
        // hooks' bindings): only remove what this hook added, and the shared
        // Reset button once no hook is attached anymore
        added.forEach(item => folder.remove(item));
        if (resetState.button && resetState.resetters.size === 0) {
          folder.remove(resetState.button);
          resetState.button = null;
        }
      } else {
        folder.dispose();
      }
    };
  }, []);

  return values;
};

export { useControls };
