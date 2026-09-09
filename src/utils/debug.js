// Single switch for the whole debug stack: the Tweakpane pane and all its
// folders (useControls), StatsGl, and the frame-performance panel with its
// GPU timer queries (PerfPanel).
//
// Dev only AND opt-in via the URL hash (localhost:5173/#debug), same
// convention as #photo. `import.meta.env.DEV` is replaced with a literal at
// build time, so production builds still tree-shake tweakpane,
// tweakpaneControls.jsx and the perfMonitor modules out of the bundle.
// Without the hash, useControls falls back to the headless version that still
// fires every control's initial onChange — that's what initializes shader
// uniforms, light params and sound volumes — so the scene renders exactly as
// it does with the panel at default values.
//
// To inspect a production build with the full debug stack, set this to `true`
// and rebuild.
export const DEBUG_ENABLED =
  import.meta.env.DEV && window.location.hash === '#debug';
