/**
 * Plays a gsap timeline built on demand, and lets the debug controls freeze
 * it at any moment. `build({ paused, ...callbacks })` returns the timeline;
 * it is rebuilt on every play/scrub so it reads the latest config.
 * `restingProgress` is the frame that matches the resting look.
 */
const createScrubbableTimeline = (build, restingProgress) => {
  let timeline = null;
  let lastProgress = restingProgress;

  const play = (callbacks = {}) => {
    timeline?.kill();
    timeline = build({ ...callbacks, paused: false });
    return timeline;
  };

  // Seek to an arbitrary [0, 1] moment (progress scrubber)
  const scrub = progress => {
    lastProgress = progress;
    timeline?.kill();
    timeline = build({ paused: true });
    timeline.progress(progress).pause();
  };

  // Rebuild the paused preview at the current frame — call after editing a
  // build-time value so the change shows while scrubbing. Never interrupts
  // an active play.
  const refresh = () => {
    if (timeline && timeline.isActive()) return;
    scrub(lastProgress);
  };

  const stop = () => {
    timeline?.kill();
    timeline = null;
    lastProgress = restingProgress;
  };

  return { play, scrub, refresh, stop };
};

export { createScrubbableTimeline };
