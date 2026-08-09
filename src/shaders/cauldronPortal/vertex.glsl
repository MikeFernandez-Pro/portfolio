// The potion mesh has no UVs, so the portal coordinates are derived from
// the local-space XZ footprint of the liquid disc (bounds passed from JS)
uniform vec2 uPortalCenter;
uniform vec2 uPortalHalfSize;

varying vec2 vPortalPosition;

void main() {
  // -1..1 across the liquid disc, 0 at its center
  vPortalPosition = (position.xz - uPortalCenter) / uPortalHalfSize;
}
