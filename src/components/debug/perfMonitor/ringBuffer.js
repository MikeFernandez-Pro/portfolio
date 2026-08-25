/**
 * Fixed-capacity numeric ring buffer. Backs the per-frame timing history the
 * view reads to draw sparklines. Push is O(1); `toArray()` returns values in
 * chronological (oldest → newest) order.
 *
 * Ported from an earlier project's perf-monitor lib (TypeScript original).
 */
export class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity);
    this.head = 0;
    this.count = 0;
  }

  push(value) {
    this.data[this.head] = value;
    this.head = (this.head + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /** Values oldest → newest. Length grows up to capacity as samples accumulate. */
  toArray() {
    const out = new Array(this.count);
    // Oldest element sits `count` slots behind head (mod capacity).
    const start = (this.head - this.count + this.capacity) % this.capacity;

    for (let i = 0; i < this.count; i++) {
      out[i] = this.data[(start + i) % this.capacity];
    }

    return out;
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }
}
