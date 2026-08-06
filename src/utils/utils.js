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
