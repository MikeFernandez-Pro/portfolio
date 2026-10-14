// Combines several signals: UA Client Hints (authoritative on Chromium),
// user agent markers (incl. iPadOS 13+ masquerading as macOS), and
// pointer/hover media queries as fallback.
const hasMobileSignals = () => {
  // Chromium exposes an authoritative flag for phones
  if (navigator.userAgentData?.mobile) return true;

  const ua = navigator.userAgent || '';
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

// Phones and touch-only tablets: mobile signals, or a coarse pointer
// without hover
export const IS_MOBILE_DEVICE =
  hasMobileSignals() ||
  (window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(hover: hover)').matches);
