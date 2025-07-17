import * as THREE from "three";

export const getDeviceType = () => {
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  if (hasCoarsePointer && !hasHover) return "mobile";
  if (!hasCoarsePointer && hasHover) return "desktop";
  return "hybrid";
};

export const IS_MOBILE_DEVICE = getDeviceType() === "mobile";
