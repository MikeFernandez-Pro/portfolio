// Browser smoke check of the production build, on both renderer backends.
// Serves dist/ with vite preview, opens it in a headed Chrome on the real GPU
// (headless Chrome does not dependably hand out a WebGPU device), presses
// Enter, watches a few seconds, and fails on any console error or uncaught
// exception, or when the frames did not draw through the expected backend:
// - WebGPU: a normal load;
// - WebGL 2: navigator.gpu hidden before the page runs, so three's
//   WebGPURenderer takes its WebGL 2 fallback.
// Draws are counted at the GPU API by a script injected before the page's
// own, so a silent fallback fails the WebGPU run. Adapted from three-vat's
// release/smoke (playwright-core: the installed Chrome, no browser download).
// Needs a browser and a GPU, so it is run by hand, after a build:
//   pnpm build && pnpm smoke
//   --browser=chrome,msedge,chromium   channels to try, in order
//   --timeout=90000                    ms the page has to show Enter
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const match = args.find(arg => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
};
const CHANNELS = flag('browser', 'chrome,msedge,chromium').split(',');
const TIMEOUT_MS = Number(flag('timeout', 90_000));
// How long the scene is watched after Enter: the intro pan, the first
// pipelines built for what comes into view
const WATCH_MS = 5_000;

// Counts draw calls per API on window.__smokeDraws
const COUNT_DRAWS = `
window.__smokeDraws = { webgpu: 0, webgl: 0 };
const wrap = (proto, names, api) => {
  if (!proto) return;
  for (const name of names) {
    const original = proto[name];
    if (typeof original !== 'function') continue;
    proto[name] = function (...callArgs) {
      window.__smokeDraws[api]++;
      return original.apply(this, callArgs);
    };
  }
};
wrap(globalThis.GPURenderPassEncoder?.prototype,
  ['draw', 'drawIndexed', 'drawIndirect', 'drawIndexedIndirect'], 'webgpu');
for (const context of [globalThis.WebGL2RenderingContext, globalThis.WebGLRenderingContext]) {
  wrap(context?.prototype, ['drawArrays', 'drawElements', 'drawArraysInstanced',
    'drawElementsInstanced', 'drawRangeElements'], 'webgl');
}`;

// What three checks to pick WebGPU: without it, the WebGL 2 fallback
const HIDE_WEBGPU = `
Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined, configurable: true });`;

// Evaluated in the page
const READ_DRAWS = '({ ...window.__smokeDraws })';

const RUNS = [
  { name: 'WebGPU', api: 'webgpu', scripts: [COUNT_DRAWS] },
  {
    name: 'WebGL 2 fallback',
    api: 'webgl',
    scripts: [HIDE_WEBGPU, COUNT_DRAWS],
  },
];

const launchChrome = async () => {
  const tried = [];
  for (const channel of CHANNELS) {
    try {
      return await chromium.launch({
        headless: false,
        channel: channel === 'chromium' ? undefined : channel,
        // WebGPU on whatever GPU this is, blocklist or not
        args: ['--ignore-gpu-blocklist'],
      });
    } catch (error) {
      tried.push(`${channel}: ${String(error).split('\n')[0]}`);
    }
  }
  throw new Error(`no browser to drive. Tried:\n  ${tried.join('\n  ')}`);
};

const smoke = async (browser, url, { name, api, scripts }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  for (const script of scripts) await page.addInitScript(script);

  const problems = [];
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => problems.push(`exception: ${error.message}`));

  try {
    await page.goto(url);
    const enter = page.locator('.start-experience');
    await enter.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    const before = await page.evaluate(READ_DRAWS);
    await enter.click();
    await page.waitForTimeout(WATCH_MS);
    const after = await page.evaluate(READ_DRAWS);
    const draws = {
      webgpu: after.webgpu - before.webgpu,
      webgl: after.webgl - before.webgl,
    };
    if (draws[api] === 0) {
      problems.push(
        `no ${api} draws after Enter (webgpu ${draws.webgpu}, webgl ${draws.webgl})`
      );
    }
    return { name, problems, draws };
  } catch (error) {
    problems.push(`driver: ${String(error).split('\n')[0]}`);
    return { name, problems, draws: null };
  } finally {
    await context.close();
  }
};

if (!existsSync('dist/index.html')) {
  console.error('dist/ not found: run `pnpm build` first');
  process.exit(1);
}

const server = await preview({ preview: { open: false } });
const url = server.resolvedUrls.local[0];
let failed = false;
try {
  const browser = await launchChrome();
  try {
    for (const run of RUNS) {
      const result = await smoke(browser, url, run);
      const pass = result.problems.length === 0;
      failed ||= !pass;
      const draws = result.draws
        ? ` (draws after Enter: webgpu ${result.draws.webgpu}, webgl ${result.draws.webgl})`
        : '';
      console.log(`${pass ? 'ok  ' : 'FAIL'} ${result.name}${draws}`);
      result.problems.forEach(problem => console.log(`  ${problem}`));
    }
  } finally {
    await browser.close();
  }
} finally {
  await new Promise(resolve => server.httpServer.close(resolve));
}
process.exit(failed ? 1 : 0);
