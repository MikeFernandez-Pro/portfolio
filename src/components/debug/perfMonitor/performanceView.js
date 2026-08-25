import { drawSparkline } from './sparkline.js';

import './performanceView.css';

/** Timing metrics graphed as sparklines. */
const TIMINGS = [
  {
    metric: 'fps',
    label: 'FPS',
    unit: '',
    format: v => Math.round(v).toString(),
    style: { stroke: '#4ade80', fill: 'rgba(74, 222, 128, 0.15)' },
  },
  {
    metric: 'cpu',
    label: 'CPU',
    unit: 'ms',
    format: v => v.toFixed(1),
    style: { stroke: '#60a5fa', fill: 'rgba(96, 165, 250, 0.15)' },
  },
  {
    metric: 'gpu',
    label: 'GPU',
    unit: 'ms',
    format: v => v.toFixed(1),
    style: { stroke: '#f472b6', fill: 'rgba(244, 114, 182, 0.15)' },
  },
];

function formatCount(value) {
  return value.toLocaleString('en-US');
}

/** Metrics printed as a single number, in display order. */
const NUMBERS = [
  { key: 'calls', label: 'Draw calls', read: s => formatCount(s.render.calls) },
  {
    key: 'triangles',
    label: 'Triangles',
    read: s => formatCount(s.render.triangles),
  },
  { key: 'lines', label: 'Lines', read: s => formatCount(s.render.lines) },
  { key: 'points', label: 'Points', read: s => formatCount(s.render.points) },
  {
    key: 'passes',
    label: 'Render passes',
    read: s => formatCount(s.render.passes),
  },
  {
    key: 'geometries',
    label: 'Geometries',
    read: s => formatCount(s.resources.geometries),
  },
  {
    key: 'textures',
    label: 'Textures',
    read: s => formatCount(s.resources.textures),
  },
  {
    key: 'shaders',
    label: 'Shaders',
    read: s => formatCount(s.resources.programs),
  },
];

function readTiming(sample, metric) {
  switch (metric) {
    case 'fps':
      return sample.fps;
    case 'cpu':
      return sample.cpu;
    case 'gpu':
      return sample.gpu.ms;
    default:
      return 0;
  }
}

function isTimingAvailable(sample, metric) {
  return metric !== 'gpu' || sample.gpu.available;
}

/**
 * Host-agnostic widget that renders samples from a PerformanceMonitor. Mount
 * `element` anywhere; the view drives its own throttled repaint loop: line
 * graphs for the timing metrics plus a numeric stat list.
 *
 * Ported from an earlier project's perf-monitor lib, trimmed of its DevTools
 * HUD/compact mode (checkbox selection, localStorage persistence).
 */
export class PerformanceView {
  constructor(options) {
    this.monitor = options.monitor;
    this.minIntervalMs = 1000 / (options.refreshHz ?? 10);

    this.graphValueEls = new Map();
    this.graphCanvases = new Map();
    this.statValueEls = new Map();

    this.rafId = null;
    this.lastPaintAt = 0;

    this.element = document.createElement('div');
    this.element.className = 'perf-monitor';

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvases());
    this.build();
  }

  start() {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.frame);
    }
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    this.element.remove();
  }

  frame = now => {
    this.rafId = requestAnimationFrame(this.frame);

    if (now - this.lastPaintAt < this.minIntervalMs) {
      return;
    }

    this.lastPaintAt = now;
    this.render();
  };

  render() {
    const sample = this.monitor.getSample();

    for (const config of TIMINGS) {
      const available = isTimingAvailable(sample, config.metric);
      const valueEl = this.graphValueEls.get(config.metric);
      valueEl.textContent = available
        ? this.formatTiming(config, readTiming(sample, config.metric))
        : 'unavailable';

      const graph = this.graphCanvases.get(config.metric);
      drawSparkline(
        graph.ctx,
        graph.width,
        graph.height,
        available ? this.monitor.getHistory(config.metric) : [],
        config.style
      );
    }

    for (const config of NUMBERS) {
      this.statValueEls.get(config.key).textContent = config.read(sample);
    }
  }

  formatTiming(config, value) {
    return `${config.format(value)}${config.unit ? ` ${config.unit}` : ''}`;
  }

  build() {
    // Graphs: one card per timing metric.
    const graphs = document.createElement('div');
    graphs.className = 'perf-monitor__graphs';

    for (const config of TIMINGS) {
      const graph = document.createElement('div');
      graph.className = 'perf-monitor__graph';

      const canvas = document.createElement('canvas');
      canvas.className = 'perf-monitor__canvas';

      const overlay = document.createElement('div');
      overlay.className = 'perf-monitor__graph-overlay';

      const label = document.createElement('span');
      label.className = 'perf-monitor__graph-label';
      label.textContent = config.label;

      const value = document.createElement('span');
      value.className = 'perf-monitor__graph-value';
      value.textContent = '—';
      this.graphValueEls.set(config.metric, value);

      overlay.append(label, value);
      graph.append(canvas, overlay);
      graphs.append(graph);

      const ctx = canvas.getContext('2d');

      if (ctx) {
        this.graphCanvases.set(config.metric, {
          canvas,
          ctx,
          width: 0,
          height: 0,
        });
        this.resizeObserver.observe(graph);
      }
    }

    // Numeric stats: one row per metric.
    const stats = document.createElement('div');
    stats.className = 'perf-monitor__section';

    for (const config of NUMBERS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'perf-monitor__row';

      const label = document.createElement('span');
      label.className = 'perf-monitor__label';
      label.textContent = config.label;

      const value = document.createElement('span');
      value.className = 'perf-monitor__value';
      value.textContent = '—';
      this.statValueEls.set(config.key, value);

      rowEl.append(label, value);
      stats.append(rowEl);
    }

    this.element.append(graphs, stats);
  }

  resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;

    for (const graph of this.graphCanvases.values()) {
      const { canvas, ctx } = graph;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width === 0 || height === 0) {
        continue;
      }

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      graph.width = width;
      graph.height = height;
    }
  }
}
