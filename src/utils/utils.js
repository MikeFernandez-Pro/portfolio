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

// Antialiasing: SMAA only (ULTRA, depth predication, after tone mapping).
// Desktop used to add 4x MSAA on the HDR composer buffer for sub-pixel
// geometry (grass blades, lantern struts), but WebGL's persistent-contents
// semantics keep ANGLE Metal from resolving MSAA in tile memory: it spills
// and reloads the full multisampled RGBA16F attachment around every pass
// that touches it — measured ~120ms/frame on an M3 Max. The Tweakpane
// "Antialiasing" msaa control still switches it live for A/B. If MSAA comes
// back: varyings on thin geometry must be `centroid` or MSAA extrapolates
// them past their vertex range (see characterLantern and grass shaders).
export const COMPOSER_MSAA = 0;
