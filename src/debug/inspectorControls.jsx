import { useEffect, useRef, useState } from 'react';

import { hasConfig, initialControlValues } from '#debug/controlsSchema.js';

/**
 * The three.js Inspector-backed implementation of useControls, active when
 * DEBUG_ENABLED (see debugEnabled.js) — production builds use the headless version
 * in useControls.jsx instead and drop this module from the bundle. Keep it
 * free of top-level side effects so it stays tree-shakeable, and keep the
 * Inspector behind the dynamic import below: its modules inject CSS at load,
 * so a static import would keep them (and their chunk) in production even
 * with this module gone.
 *
 * Bindings land in the Inspector's Parameters tab. Behaviors call sites rely
 * on (the useControls contract):
 * - keys with `onChange` are transient: excluded from the returned state and
 *   fired once with the initial value after mount, then on every change
 * - keys without `onChange` live in state and trigger a re-render on change
 * - numbers (slider with min+max, number field otherwise), hex color strings,
 *   strings, booleans, `options` selects, buttons (bare functions), and
 *   THREE.Vector2-like / [x, y, z] values (one number per axis)
 * - every folder gets a Reset button restoring its controls to their schema
 *   values (re-firing onChange / state updates); group folders reset all
 *   their subfolders. Folders start collapsed
 * - the Inspector loads asynchronously, so bindings (and the initial
 *   onChange calls) land a moment after mount — debug only
 */

// Debug folder hierarchy, in display order. `null` marks a folder that a
// useControls call fills with bindings; a nested object is a group. Titles
// must match the folderName passed at call sites and be unique across the
// tree; any title not listed here gets its own top-level folder, in mount
// order.
const FOLDER_TREE = {
  General: { Camera: null, Sounds: null, Physics: null },
  Postprocessing: {
    Effects: null,
    depthOfField: null,
    'Ambient Occlusion': null,
    Bloom: null,
    Antialiasing: null,
  },
  Sky: { SkyColors: null, Stars: null },
  WorldLight: {
    directionalLight: null,
    ambientLight: null,
  },
  NatureEffects: { 'Wind Lines': null, 'Cloud Shadows': null },
  Resume: {
    Grass: {
      Blades: null,
      Flowers: null,
      Rendering: null,
      Wind: null,
      Trample: null,
    },
    Flags: { Grade: null, British: null, French: null, Spain: null },
    SleepText: null,
  },
  Spawn: {
    'Respawn Animation': null,
    'Character Death': null,
    SpawnLight: null,
    Controls: null,
  },
  Character: {
    HeadOrb: null,
    Falling: null,
    CharacterLantern: {
      LanternTransform: null,
      LanternSwing: null,
      LanternColors: null,
      CharacterLanternLight: null,
    },
  },
  Torches: {
    Torches: null,
    TorchLights: null,
    TorchesSparks: null,
    TorchesSmoke: null,
  },
  Well: { Well: null, WellLight: null },
  Lanterns: {
    Lanterns: null,
    LanternLights: null,
    HouseLanternLight: null,
    FireFlies: null,
  },
  Candles: { Candles: null, CandlesLight: null },
  Forge: {
    ForgeSparks: null,
    Sword: { ForgeSword: null, SwordLight: null },
    ForgeLava: { ForgeLava: null, ForgeLavaLight: null },
    Window: { WindowRay: null, WindowLight: null },
  },
  Contact: { XSign: null, Signs: null },
  IndicatorLights: null,
  ProjectsPortal: {
    ProjectsPortal: null,
    PortalLight: null,
    PortalSparks: null,
  },
  ProjectsPlates: { Plates: null, PlatesLight: null },
  Cauldron: {
    CauldronPotion: null,
    CauldronBubbles: null,
    CauldronLight: null,
    CauldronSmoke: null,
  },
  SkillsIsland: { Skills: null, MagicBooks: null, SkillsGlyphLight: null },
};

// Extra titles funneled into another leaf's folder: their bindings merge
// flat into it instead of getting a folder of their own
const FOLDER_MERGES = {
  'Shadow Camera': ['WorldLight', 'directionalLight'],
};

const collectFolderPaths = (tree, parentPath, paths) => {
  for (const [title, children] of Object.entries(tree)) {
    const path = [...parentPath, title];
    if (children === null) {
      // Leaves are keyed by bare title: a duplicate would steal the other's
      // bindings
      if (paths[title]) console.warn(`Debug folder "${title}" listed twice`);
      paths[title] = path;
    } else {
      collectFolderPaths(children, path, paths);
    }
  }
};

// Call-site title -> path of the folder its bindings land in. Built lazily
// (not at module scope) so importing this module has no side effects.
let folderPaths = null;
const getFolderPaths = () => {
  if (!folderPaths) {
    folderPaths = { ...FOLDER_MERGES };
    collectFolderPaths(FOLDER_TREE, [], folderPaths);
  }
  return folderPaths;
};

// The Inspector's parameter groups have no remove(): drop an editor's row
// through the group's list and registry
const removeEditor = (folder, editor) => {
  const index = folder.objects.findIndex(entry => entry.editor === editor);
  if (index === -1) return;
  folder.paramList.remove(folder.objects[index].subItem);
  folder.objects.splice(index, 1);
};

// Per-folder reset state: the registered resetter functions of every hook
// attached to the folder, its subfolders (groups reset them too) and its
// single shared Reset button
const createFolderState = () => ({
  resetters: new Set(),
  children: [],
  button: null,
});

const runFolderReset = state => {
  state.resetters.forEach(reset => reset());
  state.children.forEach(runFolderReset);
};

const addResetButton = (folder, state) => {
  if (state.button) removeEditor(folder, state.button);
  state.button = folder.addButton(
    { Reset: () => runFolderReset(state) },
    'Reset'
  );
};

// Builds the Inspector and pre-creates the whole folder hierarchy, so groups
// keep their declared order regardless of component mount order
const createInspector = Inspector => {
  const inspector = new Inspector();
  // Start closed (just its toggle button): the Inspector restores the panel
  // as it was left, saved in localStorage
  const { profiler } = inspector;
  if (profiler.panel.classList.contains('visible')) profiler.togglePanel();

  const folders = new Map();
  const buildFolders = (tree, parentPath, parent) => {
    for (const [title, children] of Object.entries(tree)) {
      const path = [...parentPath, title];
      const folder = parent
        ? parent.folder.addFolder(title)
        : inspector.createParameters(title);
      const state = createFolderState();
      parent?.state.children.push(state);
      folder.close();
      folders.set(path.join('/'), { folder, state });
      if (children !== null) {
        buildFolders(children, path, { folder, state });
        // Group folders reset all their subfolders at once (leaf folders get
        // their own button when a hook attaches)
        addResetButton(folder, state);
      }
    }
  };
  buildFolders(FOLDER_TREE, [], null);

  globalThis.__debugInspectorFolders = folders;
  globalThis.__debugInspector = inspector;
  return inspector;
};

/**
 * The shared Inspector (survives HMR via globalThis), loaded on demand.
 * DebugInspector attaches it to the renderer and drives its frames; controls
 * can register before.
 */
const loadInspector = () => {
  if (!globalThis.__debugInspectorLoad) {
    globalThis.__debugInspectorLoad = globalThis.__debugInspector
      ? Promise.resolve(globalThis.__debugInspector)
      : import('three/addons/inspector/Inspector.js').then(({ Inspector }) =>
          createInspector(Inspector)
        );
  }
  return globalThis.__debugInspectorLoad;
};

const AXES = ['x', 'y', 'z', 'w'];

const isVectorLike = value =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.x === 'number' &&
  typeof value.y === 'number';

const isHexColor = value => /^#[0-9a-f]{3,8}$/i.test(value);

// Sliders need a sensible step even when none is given; without this,
// integer-ish values (e.g. particle counts) would become floats
const inferStep = (min, max) => {
  if (typeof min !== 'number' || typeof max !== 'number') return undefined;
  const range = max - min;
  if (!(range > 0)) return undefined;
  const rough = range / 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  return Math.round(rough / magnitude) * magnitude;
};

// One editor for a scalar binding (params[key] holds its live value)
const addScalarEditor = (folder, params, key, config) => {
  const { value, min, max, step, options: choices } = config;

  if (choices) return folder.addSelect(params, key, choices);
  if (typeof value === 'boolean') return folder.addBoolean(params, key);
  if (typeof value === 'string') {
    return isHexColor(value)
      ? folder.addColor(params, key)
      : folder.addString(params, key);
  }
  if (min !== undefined && max !== undefined) {
    return folder.addSlider(params, key, min, max, step ?? inferStep(min, max));
  }
  const editor = folder.addNumber(params, key, min, max);
  if (step !== undefined) editor.input.step = step;
  return editor;
};

const useInspectorControls = (folderName, schema) => {
  // Folder name and schema are captured on first render
  const folderNameRef = useRef(folderName);
  const schemaRef = useRef(schema);

  const [values, setValues] = useState(() =>
    initialControlValues(schemaRef.current)
  );

  useEffect(() => {
    let detach = null;
    let cancelled = false;
    loadInspector().then(inspector => {
      if (!cancelled) detach = attach(inspector);
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  // Binds this hook's schema into its folder; returns the detach function
  const attach = inspector => {
    const path = getFolderPaths()[folderNameRef.current];
    // Grouped titles attach to their pre-created folder (possibly shared with
    // other hooks); unknown titles get their own top-level folder
    // Top-level groups can't be removed from the Inspector, so the unknown
    // ones are kept by title too (a remount reuses its folder)
    const folderKey = path ? path.join('/') : folderNameRef.current;
    const folders = globalThis.__debugInspectorFolders;
    if (!folders.has(folderKey)) {
      folders.set(folderKey, {
        folder: inspector.createParameters(folderNameRef.current).close(),
        state: createFolderState(),
      });
    }
    const { folder, state } = folders.get(folderKey);

    const resetters = [];
    // Editors this hook added, removed on cleanup (a shared folder survives
    // the hook)
    const added = [];

    for (const [key, def] of Object.entries(schemaRef.current)) {
      // A bare function becomes a click button (e.g. Play / Reset actions)
      if (typeof def === 'function') {
        added.push(folder.addButton({ [key]: def }, key));
        continue;
      }

      const config = hasConfig(def) ? def : { value: def };
      const { value, min, max, step, onChange } = config;

      const emit = next => {
        if (onChange) {
          onChange(next);
        } else {
          setValues(previous => ({ ...previous, [key]: next }));
        }
      };

      if (Array.isArray(value) || isVectorLike(value)) {
        // One number per axis, labelled key.x / key.y...
        const axes = Array.isArray(value)
          ? AXES.slice(0, value.length)
          : AXES.slice(0, typeof value.z === 'number' ? 3 : 2);
        const initialAxes = axes.map((axis, index) =>
          Array.isArray(value) ? value[index] : value[axis]
        );
        const params = Object.fromEntries(
          axes.map((axis, index) => [`${key}.${axis}`, initialAxes[index]])
        );
        const current = () => {
          const components = axes.map(axis => params[`${key}.${axis}`]);
          if (Array.isArray(value)) return components;
          // Mutate the original vector instance (e.g. THREE.Vector2) so
          // consumers holding a reference keep seeing fresh values
          axes.forEach((axis, index) => (value[axis] = components[index]));
          return value;
        };

        axes.forEach((axis, index) => {
          const label = `${key}.${axis}`;
          const editor = addScalarEditor(folder, params, label, {
            value: initialAxes[index],
            min,
            max,
            step,
          });
          editor.addEventListener('change', () => emit(current()));
          added.push(editor);
          resetters.push(() => editor.setValue(initialAxes[index]));
        });
      } else {
        const params = { [key]: value };
        const editor = addScalarEditor(folder, params, key, config);
        // The editor writes params[key] itself; the event carries the value
        editor.addEventListener('change', ({ value: next }) => emit(next));
        added.push(editor);
        resetters.push(() => editor.setValue(value));
      }

      // onChange fires once with the initial value after mount
      if (onChange) onChange(value);
    }

    // Every folder gets a Reset button restoring its controls to the schema
    // values. Hooks merged into the same folder share one button, re-created
    // on attach so it stays last
    resetters.forEach(reset => state.resetters.add(reset));
    addResetButton(folder, state);

    return () => {
      resetters.forEach(reset => state.resetters.delete(reset));
      added.forEach(editor => removeEditor(folder, editor));
      if (state.resetters.size === 0 && state.children.length === 0) {
        removeEditor(folder, state.button);
        state.button = null;
      }
    };
  };

  return values;
};

export { useInspectorControls, loadInspector };
