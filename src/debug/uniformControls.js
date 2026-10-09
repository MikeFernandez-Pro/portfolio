/**
 * useControls entries that write a TSL uniform straight through (no
 * re-render). `uniformControls(uniforms)` returns a factory
 * `(name, value, min, max, step)`; color uniforms (THREE.Color values) take
 * the hex string through `set`, anything else is assigned to `.value`.
 */
const uniformControls = uniforms => (name, value, min, max, step) => ({
  value,
  min,
  max,
  step,
  onChange: v => {
    const node = uniforms[name];
    if (node.value?.isColor) node.value.set(v);
    else node.value = v;
  },
});

export { uniformControls };
