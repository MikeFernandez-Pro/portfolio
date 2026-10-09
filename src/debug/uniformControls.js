/**
 * useControls entries that write a TSL uniform straight through (no
 * re-render). `uniformControls(uniforms)` returns a factory
 * `(name, value, min, max, step)`; color uniforms (THREE.Color values) take
 * the hex string through `set`, anything else is assigned to `.value`.
 * `uniforms` can also be a getter, for uniforms created after the controls
 * mount: changes made while it returns nothing are skipped.
 */
const uniformControls = uniforms => {
  const resolve = typeof uniforms === 'function' ? uniforms : () => uniforms;
  return (name, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      const node = resolve()?.[name];
      if (!node) return;
      if (node.value?.isColor) node.value.set(v);
      else node.value = v;
    },
  });
};

export { uniformControls };
