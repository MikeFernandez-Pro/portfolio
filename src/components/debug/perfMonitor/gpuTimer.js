/**
 * Real GPU frame timing via `EXT_disjoint_timer_query_webgl2`.
 *
 * A `TIME_ELAPSED` query measures GPU-side time for the commands issued between
 * `begin()` and `end()`. Results resolve asynchronously (a few frames late), so
 * we keep a small pool of query objects: each frame issues one query and harvests
 * whichever older ones have completed. The reported value is therefore always the
 * last-resolved measurement, never the current frame's.
 *
 * Only one `TIME_ELAPSED` query can be active at a time, so exactly one wraps the
 * whole frame. WebGL2-only by design; `create()` returns null otherwise.
 */
export class GpuTimer {
  constructor(gl, ext, poolSize) {
    this.gl = gl;
    this.ext = ext;
    this.free = [];
    /** FIFO of ended queries awaiting their result. */
    this.pending = [];
    this.active = null;
    this.lastMs = 0;

    for (let i = 0; i < poolSize; i++) {
      const query = gl.createQuery();

      if (query) {
        this.free.push(query);
      }
    }
  }

  /** Build a timer for WebGL2 contexts that support the extension, else null. */
  static create(gl, poolSize) {
    if (!(gl instanceof WebGL2RenderingContext)) {
      return null;
    }

    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');

    return ext ? new GpuTimer(gl, ext, poolSize) : null;
  }

  /** Start timing this frame. No-op when every query is still in flight. */
  begin() {
    if (this.active) {
      // The previous frame aborted between begin() and end(): an exception
      // in the useFrame chain skips the end() subscriber, leaving the query
      // active on the context — beginQuery would fail every frame after.
      // Close and recycle it (its measurement is garbage) and let the real
      // exception surface in the console.
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.free.push(this.active);
      this.active = null;
      console.warn(
        'GpuTimer: previous frame aborted between begin() and end() — ' +
          'a useFrame subscriber threw. Check the console for the exception.'
      );
    }

    const query = this.free.pop();

    if (!query) {
      // Pool exhausted (results lagging badly); skip timing this frame.
      this.active = null;

      return;
    }

    this.active = query;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
  }

  /** Stop timing this frame and queue the query for later harvest. */
  end() {
    if (!this.active) {
      return;
    }

    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /**
   * Harvest completed queries. Call once per frame. If the GPU signalled a
   * disjoint event, every in-flight measurement is unreliable and is dropped
   * (queries recycled) without updating the reported value.
   */
  poll() {
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

    if (disjoint) {
      while (this.pending.length > 0) {
        this.free.push(this.pending.shift());
      }

      return;
    }

    // FIFO: queries complete in submission order, so once the oldest is not
    // ready, none behind it are either.
    while (this.pending.length > 0) {
      const query = this.pending[0];
      const ready = this.gl.getQueryParameter(
        query,
        this.gl.QUERY_RESULT_AVAILABLE
      );

      if (!ready) {
        break;
      }

      this.pending.shift();
      const ns = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
      this.lastMs = ns / 1e6;
      this.free.push(query);
    }
  }

  /** Last resolved GPU frame time in ms. */
  getMs() {
    return this.lastMs;
  }

  dispose() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.active = null;
    }

    for (const query of this.free) {
      this.gl.deleteQuery(query);
    }

    for (const query of this.pending) {
      this.gl.deleteQuery(query);
    }

    this.free.length = 0;
    this.pending.length = 0;
  }
}

/**
 * GPU frame timing for three's WebGPURenderer (either backend), through its
 * timestamp queries: the renderer must be created with
 * `trackTimestamp: true`. `resolveTimestampsAsync()` returns the GPU time of
 * every render pass since the previous resolve, a few frames late; while one
 * resolve is in flight the frames keep accumulating, so the result is
 * divided by the number of frames it covers.
 */
export class WebGpuTimer {
  constructor(renderer) {
    this.renderer = renderer;
    this.resolving = false;
    this.framesSinceResolve = 0;
    this.lastMs = 0;
  }

  /** Timer for a WebGPURenderer tracking timestamps, else null. */
  static create(renderer) {
    return renderer.isWebGPURenderer && renderer.backend?.trackTimestamp
      ? new WebGpuTimer(renderer)
      : null;
  }

  // The render passes are timed by the renderer itself
  begin() {}

  end() {
    this.framesSinceResolve++;
  }

  /** Kicks a resolve when none is in flight. */
  poll() {
    if (this.resolving || !this.renderer) return;

    const frames = this.framesSinceResolve;
    this.framesSinceResolve = 0;
    this.resolving = true;

    this.renderer
      .resolveTimestampsAsync('render')
      .then(ms => {
        if (typeof ms === 'number' && frames > 0) this.lastMs = ms / frames;
      })
      .finally(() => {
        this.resolving = false;
      });
  }

  /** Last resolved GPU frame time in ms. */
  getMs() {
    return this.lastMs;
  }

  dispose() {
    this.renderer = null;
  }
}
