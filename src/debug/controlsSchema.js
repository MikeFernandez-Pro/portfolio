// Schema parsing shared by both useControls implementations (headless and
// Inspector). No side effects at module scope: production imports it.

// `{ value, ... }` entries (vs bare values and buttons)
const hasConfig = def =>
  def !== null &&
  typeof def === 'object' &&
  !Array.isArray(def) &&
  'value' in def;

// State returned to the call site: every key except buttons (bare functions)
// and transient keys (with an onChange), at its schema value
const initialControlValues = schema => {
  const initial = {};
  for (const [key, def] of Object.entries(schema)) {
    if (typeof def === 'function') continue;
    if (hasConfig(def)) {
      if (def.onChange) continue;
      initial[key] = def.value;
    } else {
      initial[key] = def;
    }
  }
  return initial;
};

export { hasConfig, initialControlValues };
