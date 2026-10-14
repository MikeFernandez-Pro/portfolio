// Builds the WGSL three's WebGPU backend would generate for the project's
// React-free materials (src/shaders, the point light / cloud shadow patches,
// the wind lines), in Node, without a GPU. Catches what lint and the build
// cannot see before a browser does:
// - a TSL graph that fails to build (on WebGPU, a mesh that silently draws
//   nothing);
// - a variable read before any path assigned it: WGSL zeroes three's
//   variables where it declares them, so it compiles and draws wrong (a
//   variable first built inside one branch of a select);
// - pow() calls whose base is not clamped non-negative, listed for review:
//   WGSL pow of a negative base is NaN.
// The stand-in renderer and unassignedReads come from three-vat
// (src/test-utils.ts, three r186): a three upgrade that reads one more
// renderer field fails here with a TypeError, and one more field to stand in.
//   pnpm check-wgsl          (exit 1 on a build error or an unassigned read)
//   pnpm check-wgsl --wgsl   (also print every shader)
import { register } from 'node:module';

// Asset imports (textures, models, sounds) resolve to a placeholder URL
register(
  'data:text/javascript,' +
    encodeURIComponent(String.raw`
const ASSET = /\.(ktx2|webp|png|jpe?g|glb|gltf|mp3|webm|woff2?|svg|hdr)(\?.*)?$/;
export async function resolve(specifier, context, next) {
  if (ASSET.test(specifier)) {
    return { url: 'data:text/javascript,export default "asset"', shortCircuit: true };
  }
  return next(specifier, context);
}`)
);
// What the imported modules read from the browser at load
globalThis.window ??= globalThis;
globalThis.matchMedia ??= () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});

const THREE = await import('three/webgpu');
const { attribute, context, uniform } = await import('three/tsl');
const { createSmokeMaterial, createSmokeUniforms } =
  await import('../src/shaders/smoke.js');
const { createGrassMaterial, createGrassUniforms } =
  await import('../src/shaders/grass.js');
const { createDissolveUniforms, characterDissolveColor } =
  await import('../src/shaders/dissolve.js');
const { patchCloudShadows } = await import('../src/shaders/cloudShadows.js');
const { patchPointLights } =
  await import('../src/islands/world/pointLights/pointLights.js');
const { createWindLinesMaterial, createWindLinesUniforms } =
  await import('../src/environment/windLinesMaterial.js');
const { TORCH_SMOKE_DEFAULTS } =
  await import('../src/islands/world/torches/torches.js');
const { createPortalDiscMaterial, createPortalDiscUniforms } =
  await import('../src/islands/projects/portalDisc.js');
const { createCauldronPotionMaterial, createCauldronPotionUniforms } =
  await import('../src/islands/skills/cauldron/cauldronPotion.js');

const standInRenderer = library => ({
  backend: {
    isWebGPUBackend: true,
    compatibilityMode: false,
    hasFeature: () => false,
    utils: {
      getTextureSampleData: () => ({
        samples: 1,
        primarySamples: 1,
        isMSAA: false,
      }),
    },
    capabilities: { getUniformBufferLimit: () => 65536 },
    device: { limits: { maxUniformBufferBindingSize: 65536 } },
  },
  library,
  contextNode: context(),
  getRenderTarget: () => null,
  getMRT: () => null,
  getOutputRenderTarget: () => null,
  getColorBufferType: () => THREE.HalfFloatType,
  toneMapping: THREE.NoToneMapping,
  outputColorSpace: THREE.SRGBColorSpace,
  currentColorSpace: THREE.SRGBColorSpace,
  lighting: { getNode: () => null },
  shadowMap: {},
  xr: { isPresenting: false },
  debug: { diagnostics: { keywords: false } },
  hasFeature: () => false,
  getMaxAnisotropy: () => 1,
});

const buildWGSL = (object, material) => {
  const builder = new THREE.WGSLNodeBuilder(
    object,
    standInRenderer(new THREE.StandardNodeLibrary())
  );
  builder.material = material;
  builder.camera = new THREE.PerspectiveCamera();
  builder.scene = new THREE.Scene();
  builder.nodeFrame = new THREE.NodeFrame();
  builder.build();
  return { vertex: builder.vertexShader, fragment: builder.fragmentShader };
};

/**
 * Every read, in a shader's `main`, of a TSL variable no path to it has
 * assigned, as the variable and its line. Read off the text three writes,
 * one statement or brace a line: an `if` passes on what both its sides
 * assign, an `if` without an `else` and a loop pass on nothing.
 */
const unassignedReads = wgsl => {
  const lines = wgsl.slice(wgsl.indexOf('fn main(')).split('\n');
  const body = lines.findIndex(line => line.trimEnd().endsWith('{'));
  const scopes = [{ kind: 'main', assigned: new Set() }];
  const current = () => scopes[scopes.length - 1];
  const found = [];
  const read = (code, line) => {
    for (const name of code.match(/\bnodeVar\d+/g) ?? []) {
      if (!current().assigned.has(name)) found.push(`${name}: ${line}`);
    }
  };
  for (const raw of lines.slice(body + 1)) {
    const line = raw.trim();
    if (
      line === '' ||
      line.startsWith('//') ||
      /^var nodeVar\d+ : [^=]+;$/.test(line)
    ) {
      continue;
    }
    if (line === '}') {
      const closed = scopes.pop();
      if (closed.kind === 'main') break;
      if (closed.kind === 'else') {
        for (const name of closed.assigned) {
          if (closed.ifAssigned.has(name)) current().assigned.add(name);
        }
      }
    } else if (line === '} else {') {
      const ifAssigned = scopes.pop().assigned;
      scopes.push({
        kind: 'else',
        assigned: new Set(current().assigned),
        ifAssigned,
      });
    } else if (line.startsWith('if (') || line.startsWith('for (')) {
      read(line, line);
      scopes.push({
        kind: line.startsWith('if') ? 'if' : 'loop',
        assigned: new Set(current().assigned),
      });
    } else {
      const target = /^(nodeVar\d+)\s*=(?!=)/.exec(line);
      read(target ? line.slice(target[0].length) : line, line);
      if (target) current().assigned.add(target[1]);
    }
  }
  return found;
};

// The first argument of each pow( call, when it is not visibly non-negative
// and not one of the bases below, already reviewed
const NON_NEGATIVE = /^(max|abs|clamp|saturate|length|exp|exp2|sqrt)\(|^\d/;
const REVIEWED_POWS = [
  // Cloud shadow shade: mix(1, clamp(darkness, 0, 1), weight in [0, 1])
  { base: /^mix\( 1\.0, clamp\(/ },
  // Dissolve triplanar weights: abs(n) / max(length(n), eps)
  { base: /^\( abs\(/ },
  // Point light falloff: only computed inside `if (falloff > 0.0)`
  { line: /pow\( nodeVar\d+, decayPower \)/ },
];
const suspiciousPows = wgsl => {
  const found = [];
  let at = wgsl.indexOf('pow(');
  while (at !== -1) {
    let depth = 0;
    let end = at + 4;
    for (; end < wgsl.length; end++) {
      const ch = wgsl[end];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth < 0 || (depth === 0 && ch === ',')) break;
    }
    const base = wgsl.slice(at + 4, end).trim();
    const call = wgsl.slice(at, wgsl.indexOf(')', end) + 1);
    const reviewed = REVIEWED_POWS.some(
      ({ base: b, line }) => b?.test(base) || line?.test(call)
    );
    if (!NON_NEGATIVE.test(base) && !reviewed) found.push(base);
    at = wgsl.indexOf('pow(', end);
  }
  return found;
};

// --- the materials, set up like their components do ---------------------
const dataTexture = () => {
  const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  tex.needsUpdate = true;
  return tex;
};

const instanced = (base, attributes) => {
  const geometry = new THREE.InstancedBufferGeometry().copy(base);
  for (const [name, size] of Object.entries(attributes)) {
    geometry.setAttribute(
      name,
      new THREE.InstancedBufferAttribute(new Float32Array(size), size)
    );
  }
  return geometry;
};

const grassGeometry = () => {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(12), 3)
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(new Float32Array(12), 3)
  );
  geometry.setAttribute(
    'aBladePosition',
    new THREE.InstancedBufferAttribute(new Float32Array(2), 2)
  );
  return geometry;
};

const grass = (lit, trample) => () => {
  const uniforms = createGrassUniforms({
    heightTexture: dataTexture(),
    perlinTexture: dataTexture(),
    trampleTexture: dataTexture(),
  });
  const material = createGrassMaterial({ uniforms, lit, trample });
  return new THREE.Mesh(grassGeometry(), material);
};

const litPatched = material => {
  patchCloudShadows(material);
  patchPointLights(material);
  return material;
};

const MATERIALS = {
  'smoke (torch columns)': () => {
    const geometry = instanced(new THREE.PlaneGeometry(1, 10, 4, 16), {
      aColumnOffset: 3,
      aTimeOffset: 1,
    });
    const material = createSmokeMaterial(
      createSmokeUniforms(TORCH_SMOKE_DEFAULTS),
      attribute('aTimeOffset', 'float'),
      position => position.add(attribute('aColumnOffset', 'vec3'))
    );
    return new THREE.Mesh(geometry, material);
  },
  'grass (unlit, trample)': grass(false, true),
  'grass (lit, trample)': grass(true, true),
  'grass (unlit, mobile)': grass(false, false),
  'terrain (cloud shadows + point lights)': () =>
    new THREE.Mesh(
      new THREE.BoxGeometry(),
      litPatched(new THREE.MeshStandardNodeMaterial({ map: dataTexture() }))
    ),
  'character dissolve (+ patches)': () => {
    const uniforms = {
      ...createDissolveUniforms(dataTexture(), {
        color: '#25c447',
        intensity: 1,
        repeat: 1,
        perlinScale: 1,
        perlinStrength: 1,
        perlinSpeed: 1,
        thickness: 0.1,
      }),
      uCharFormProgress: uniform(1),
      uAlphaClip: uniform(0.5),
    };
    const material = new THREE.MeshStandardNodeMaterial({ map: dataTexture() });
    material.colorNode = characterDissolveColor(
      uniforms,
      uniform(new THREE.Vector3(-1, -1, -1)),
      uniform(new THREE.Vector3(1, 1, 1))
    );
    return new THREE.Mesh(new THREE.BoxGeometry(), litPatched(material));
  },
  'portal disc (flow field)': () =>
    new THREE.Mesh(
      new THREE.CircleGeometry(1, 16),
      createPortalDiscMaterial(
        createPortalDiscUniforms(),
        dataTexture(),
        dataTexture()
      )
    ),
  'cauldron potion (flow field)': () => {
    const uniforms = createCauldronPotionUniforms({
      center: new THREE.Vector2(0, 0),
      halfSize: new THREE.Vector2(1, 1),
    });
    return new THREE.Mesh(
      new THREE.BoxGeometry(),
      createCauldronPotionMaterial(uniforms, dataTexture())
    );
  },
  'wind lines': () => {
    const geometry = instanced(new THREE.PlaneGeometry(1, 0.1, 20, 1), {
      aInstanceOffset: 3,
      aInstanceTimeOffset: 1,
    });
    const material = createWindLinesMaterial(createWindLinesUniforms());
    return new THREE.Mesh(geometry, material);
  },
};

// --- run --------------------------------------------------------------------
const printShaders = process.argv.includes('--wgsl');
let failed = false;
for (const [name, make] of Object.entries(MATERIALS)) {
  let shaders;
  try {
    const mesh = make();
    shaders = buildWGSL(mesh, mesh.material);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${name}: build error\n  ${error.stack}`);
    continue;
  }
  const issues = [];
  for (const [stage, wgsl] of Object.entries(shaders)) {
    for (const read of unassignedReads(wgsl)) {
      failed = true;
      issues.push(`  ${stage}: unassigned read ${read}`);
    }
    for (const base of suspiciousPows(wgsl)) {
      issues.push(`  ${stage}: review pow() base ${base.slice(0, 120)}`);
    }
  }
  console.log(
    `${issues.some(i => i.includes('unassigned')) ? 'FAIL' : 'ok  '} ${name}`
  );
  issues.forEach(issue => console.log(issue));
  if (printShaders) {
    console.log(`--- ${name} vertex ---\n${shaders.vertex}`);
    console.log(`--- ${name} fragment ---\n${shaders.fragment}`);
  }
}
process.exit(failed ? 1 : 0);
