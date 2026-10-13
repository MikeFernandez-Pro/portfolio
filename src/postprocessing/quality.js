// How much of the look a device draws: a ladder of steps, from the whole look
// down to a pixel ratio of 1, and a governor that moves along it by how the
// frames come. Too many slow frames, and it steps down; a while of smooth
// ones, and it tries a step up. Ported from three-vat's last-light
// (games/last-light/src/quality.ts, ADR-0048); no renderer and no DOM.
//
// A 60 Hz screen shows a frame every 16.7 ms however little the GPU needed,
// so room to spare cannot be read off the frames. The governor finds it by
// trying: it steps up, and if that step is too slow it comes back down and
// waits longer before trying again; failed twice, it never tries that step
// again. A device that heats up only gets slower, so a step given up stays
// given up.

/**
 * Pixel ratio ceiling. dpr 2 is 4x the fill of dpr 1; 1.5 is the visual
 * sweet spot. The ladder's last step drops to 1
 */
export const MAX_DPR = 1.5;

/**
 * The ladder from the whole look `full` ({ msaa, dof, ao, dpr }: what the
 * device draws at best): MSAA off, then depth of field, then AO, then the
 * pixel ratio down to 1. What `full` already lacks is no step.
 */
export const qualityLadder = full => {
  const steps = [{ ...full }];
  const last = () => steps[steps.length - 1];
  if (full.msaa > 0) steps.push({ ...last(), msaa: 0 });
  if (full.dof) steps.push({ ...last(), dof: false });
  if (full.ao) steps.push({ ...last(), ao: false });
  if (full.dpr > 1) steps.push({ ...last(), dpr: 1 });
  return steps;
};

// The frames are judged over this long, ms
const WINDOW = 1500;
// After a change of step, frames are not judged for this long, ms: the new
// pipeline compiles, and the first frames hitch
const SETTLE = 1000;
// A frame longer than this is slow, ms: past one vsync at 60 Hz
const SLOW_FRAME = 20;
// More than this share of slow frames in a window, and the device is not
// keeping up
const SLOW_SHARE = 0.25;
// A gap longer than this is no frame, ms: the tab put away, or the page paused
const GAP = 250;
// How long the frames must keep up before a step up is tried, ms; doubled
// each time a try fails
const UP_WAIT = 5000;
// Tries at a step before it is given up
const TRIES = 2;

export class QualityGovernor {
  /**
   * `steps` from qualityLadder, starting at `start`; frames are judged from
   * `now` + SETTLE ms on.
   */
  constructor(steps, start = 0, now = 0) {
    this.steps = steps;
    // The step drawn now: an index into the ladder, 0 the whole look
    this.level = start;
    // No step above this is tried again: those were too slow
    this.ceiling = 0;
    this.failures = steps.map(() => 0);
    this.windowStart = -1;
    this.frames = 0;
    this.slow = 0;
    // Until when frames are not judged, ms
    this.settledAt = now + SETTLE;
    // How long the frames have kept up since the last change, ms
    this.smooth = 0;
    this.upWait = UP_WAIT;
    // Stepped up and not yet judged at the new step: slow there, and the try
    // failed
    this.trying = false;
  }

  get step() {
    return this.steps[this.level];
  }

  /** A frame `ms` long, ending at `now` ms: true when the step changes. */
  frame(ms, now) {
    if (ms > GAP || now < this.settledAt) {
      this.windowStart = -1;
      return false;
    }
    if (this.windowStart < 0) {
      this.windowStart = now - ms;
      this.frames = this.slow = 0;
    }
    this.frames++;
    if (ms > SLOW_FRAME) this.slow++;
    if (now - this.windowStart < WINDOW) return false;

    const keepingUp = this.slow <= this.frames * SLOW_SHARE;
    const length = now - this.windowStart;
    this.windowStart = -1;
    if (!keepingUp) {
      this.smooth = 0;
      if (this.trying) {
        // The step up was too slow: back down, wait longer, and after enough
        // tries give it up
        this.trying = false;
        if (++this.failures[this.level] >= TRIES) this.ceiling = this.level + 1;
        this.upWait *= 2;
      }
      if (this.level === this.steps.length - 1) return false;
      return this.change(this.level + 1, now);
    }
    if (this.trying) {
      this.trying = false;
      this.upWait = UP_WAIT;
    }
    this.smooth += length;
    if (this.smooth < this.upWait || this.level <= this.ceiling) return false;
    this.trying = true;
    return this.change(this.level - 1, now);
  }

  change(level, now) {
    this.level = level;
    this.smooth = 0;
    this.settledAt = now + SETTLE;
    return true;
  }
}
