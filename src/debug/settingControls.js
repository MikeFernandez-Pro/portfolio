/**
 * useControls entries that write a field of a plain settings object.
 * `settingControls(settings, apply)` returns a factory
 * `(key, min, max, step)` starting each control at the field's current
 * value; `apply(key, value)` (optional) runs after every write.
 */
const settingControls = (settings, apply) => (key, min, max, step) => ({
  value: settings[key],
  min,
  max,
  step,
  onChange: v => {
    settings[key] = v;
    apply?.(key, v);
  },
});

export { settingControls };
