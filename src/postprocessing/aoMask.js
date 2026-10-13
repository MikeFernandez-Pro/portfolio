// Scene pass output holding what transparent surfaces drawn over the scene
// contribute to the image, so the AO can be applied to what lies behind them
// only. Written by the clouds (they write no depth: GTAO sees the islands
// behind them). Each writes its color with the same blending as the main
// output, so the target holds exactly their premultiplied contribution M:
// the scene color is C = behind * (1 - coverage) + M, and the AO pass outputs
// (C - M) * ao + M, as if they were drawn after the AO.
// Only active while the AO runs (the pass has no MRT otherwise; the clouds'
// mrtNode then keeps just their `output`).
export const AO_MASK = 'aoMask';
