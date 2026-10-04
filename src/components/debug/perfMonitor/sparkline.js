/**
 * Minimal canvas sparkline. The caller owns the canvas, its size, and any
 * device-pixel-ratio transform; this just paints a filled line series in
 * logical (CSS) pixel coordinates.
 */
export function drawSparkline(ctx, width, height, values, style) {
  ctx.clearRect(0, 0, width, height);

  if (values.length < 2) {
    return;
  }

  // Auto-scale to the series peak (min pinned to 0) with a little headroom so
  // the line never kisses the top edge.
  let max = 0;

  for (const value of values) {
    if (value > max) {
      max = value;
    }
  }

  const range = max * 1.1 || 1;
  const stepX = width / (values.length - 1);
  const toY = value => height - (value / range) * height;

  ctx.beginPath();
  ctx.moveTo(0, toY(values[0]));

  for (let i = 1; i < values.length; i++) {
    ctx.lineTo(i * stepX, toY(values[i]));
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = style.stroke;
  ctx.stroke();

  // Fill the area under the line.
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = style.fill;
  ctx.fill();
}
