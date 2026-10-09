// Combines several signals: UA Client Hints (authoritative on Chromium),
// user agent markers (incl. iPadOS 13+ masquerading as macOS), and
// pointer/hover media queries as fallback.
const hasMobileSignals = () => {
  // Chromium exposes an authoritative flag for phones
  if (navigator.userAgentData?.mobile) return true;

  const ua = navigator.userAgent || "";
  if (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
      ua
    )
  ) {
    return true;
  }

  // iPadOS 13+ reports a macOS user agent but is multi-touch
  if (/Macintosh|MacIntel/.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }

  return false;
};

export const getDeviceType = () => {
  if (hasMobileSignals()) return "mobile";

  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  if (hasCoarsePointer && !hasHover) return "mobile";
  if (!hasCoarsePointer && hasHover) return "desktop";
  return "hybrid";
};

export const IS_MOBILE_DEVICE = getDeviceType() === "mobile";

// Photo mode (localhost/...#photo): bare three.js scene with a free camera —
// no debug pane, no stats, no sound/intro UI, audio muted
export const IS_PHOTO_MODE = window.location.hash === "#photo";

// Pixel ratio ceiling. dpr 2 is 4x the fill of dpr 1; 1.5 is the visual
// sweet spot. Slow machines drop to 1 through <PerformanceMonitor> (App.jsx)
export const MAX_DPR = 1.5;

// Antialiasing: 4x MSAA on the scene pass (desktop) + SMAA after tone
// mapping. Under WebGL, MSAA was dropped: its persistent-contents semantics
// kept ANGLE Metal from resolving in tile memory (~120ms/frame spill/reload on
// an M3 Max). WebGPU resolves in the render pass, so it is cheap again.
// Mobile stays SMAA-only. The Tweakpane "Antialiasing" msaa control rebuilds
// the pipeline for A/B. Varyings on thin geometry must be centroid-sampled or
// MSAA extrapolates them past their vertex range (lantern, grass).
export const COMPOSER_MSAA = IS_MOBILE_DEVICE ? 0 : 4;
