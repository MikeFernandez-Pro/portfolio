import { GpuTimer, WebGpuTimer } from './gpuTimer.js';
import { RingBuffer } from './ringBuffer.js';

const DEFAULT_GPU_POOL_SIZE = 5;
const DEFAULT_HISTORY_SIZE = 120;
/** EMA weight for the displayed FPS; raw per-frame values still feed the graph. */
const FPS_SMOOTHING = 0.1;

/**
 * App-agnostic collector of three.js frame-performance metrics. Bracket each
 * frame with begin()/end(); read the latest values with getSample() and
 * per-frame graph history with getHistory().
 *
 * Depends only on a three.js renderer — never on the host app. GPU timing
 * comes from the timer-query extension on a WebGLRenderer, or the timestamp
 * queries of a WebGPURenderer created with `trackTimestamp: true`; it
 * degrades to `available: false` otherwise.
 */
export class PerformanceMonitor {
  constructor(options) {
    const {
      renderer,
      trackGPU = true,
      gpuQueryPoolSize = DEFAULT_GPU_POOL_SIZE,
      historySize = DEFAULT_HISTORY_SIZE,
    } = options;

    this.renderer = renderer;

    // Take ownership of info resetting. With autoReset on (the default), every
    // internal render() call — each postprocessing pass — clears the counters,
    // so by end() only the last pass survives (e.g. a single fullscreen quad).
    // We reset once per frame in begin() instead, so counts accumulate across
    // all passes. Restored in dispose().
    renderer.info.autoReset = false;

    // Count render passes ourselves: three.js exposes no per-frame pass count,
    // so wrap render() and tally invocations between begin()/end(). Restored in
    // dispose().
    this.originalRender = renderer.render;
    /** `renderer.render()` invocations since the last begin(). */
    this.renderPasses = 0;

    renderer.render = (scene, camera) => {
      this.renderPasses++;
      this.originalRender.call(renderer, scene, camera);
    };

    this.gpuTimer = !trackGPU
      ? null
      : renderer.isWebGPURenderer
        ? WebGpuTimer.create(renderer)
        : GpuTimer.create(renderer.getContext(), gpuQueryPoolSize);

    this.fpsHistory = new RingBuffer(historySize);
    this.cpuHistory = new RingBuffer(historySize);
    this.gpuHistory = new RingBuffer(historySize);

    this.cpuStart = 0;
    this.lastBeginAt = null;
    this.frameFps = 0;
    this.smoothedFps = 0;
    this.sample = this.buildEmptySample();
  }

  /** Mark the start of a frame's CPU work. Call at the top of the render loop. */
  begin() {
    const now = performance.now();

    if (this.lastBeginAt !== null) {
      const frameMs = now - this.lastBeginAt;
      this.frameFps = frameMs > 0 ? 1000 / frameMs : 0;
    }

    this.lastBeginAt = now;
    this.cpuStart = now;
    this.renderPasses = 0;
    // Clear render counters so this frame's passes accumulate from zero.
    this.renderer.info.reset();
    this.gpuTimer?.begin();
  }

  /** Mark the end of a frame. Call after the render call; rebuilds the sample. */
  end() {
    const now = performance.now();
    const cpu = now - this.cpuStart;

    this.gpuTimer?.end();
    this.gpuTimer?.poll();

    const gpuMs = this.gpuTimer?.getMs() ?? 0;

    this.smoothedFps =
      this.smoothedFps === 0
        ? this.frameFps
        : this.smoothedFps + (this.frameFps - this.smoothedFps) * FPS_SMOOTHING;

    this.fpsHistory.push(this.frameFps);
    this.cpuHistory.push(cpu);
    this.gpuHistory.push(gpuMs);

    const info = this.renderer.info;

    this.sample = Object.freeze({
      fps: this.smoothedFps,
      cpu,
      gpu: { ms: gpuMs, available: this.gpuTimer !== null },
      render: {
        // WebGPURenderer: drawCalls is per frame (calls is cumulative)
        calls: info.render.drawCalls ?? info.render.calls,
        triangles: info.render.triangles,
        lines: info.render.lines,
        points: info.render.points,
        passes: this.renderPasses,
      },
      resources: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.memory.programs ?? info.programs?.length ?? 0,
      },
    });
  }

  /** The most recent sample. Stable reference until the next end(). */
  getSample() {
    return this.sample;
  }

  /** Per-frame history for a timing metric ('fps' | 'cpu' | 'gpu'), oldest → newest. */
  getHistory(metric) {
    switch (metric) {
      case 'fps':
        return this.fpsHistory.toArray();
      case 'cpu':
        return this.cpuHistory.toArray();
      case 'gpu':
        return this.gpuHistory.toArray();
      default:
        return [];
    }
  }

  dispose() {
    // The renderer outlives the monitor; hand resetting back to three and
    // restore the unwrapped render().
    this.renderer.info.autoReset = true;
    this.renderer.render = this.originalRender;
    this.gpuTimer?.dispose();
    this.fpsHistory.clear();
    this.cpuHistory.clear();
    this.gpuHistory.clear();
  }

  buildEmptySample() {
    return Object.freeze({
      fps: 0,
      cpu: 0,
      gpu: { ms: 0, available: this.gpuTimer !== null },
      render: { calls: 0, triangles: 0, lines: 0, points: 0, passes: 0 },
      resources: { geometries: 0, textures: 0, programs: 0 },
    });
  }
}
