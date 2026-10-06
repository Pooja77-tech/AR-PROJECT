export const FINGER_TIPS = [4, 8, 12, 16, 20];
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

// Supporting vines are composited behind the camera's approximate hand mask.
// The bouquet itself has volumetric stems and leaves in the 3D renderer.
export function drawStem(ctx, start, target, growth) {
  const end = { x: start.x + (target.x - start.x) * growth, y: start.y + (target.y - start.y) * growth };
  const control = { x: start.x + (end.x - start.x) * .4 + 8, y: start.y + (end.y - start.y) * .6 };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length < 1) return;
  ctx.save(); ctx.lineCap = 'round';
  for (const [width, color, offset] of [[3.8, '#2f4923', 0], [2.2, '#658243', -.5], [.7, '#a0b26d', -1]]) {
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(start.x + offset, start.y); ctx.quadraticCurveTo(control.x + offset, control.y, end.x + offset, end.y); ctx.stroke();
  }
  for (const [index, t] of [.28, .57, .78].entries()) {
    const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
    const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
    const leafSize = Math.min(25, length * .2);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(end.y - start.y, end.x - start.x) + (index % 2 ? -.8 : .8));
    const gradient = ctx.createLinearGradient(0, -5, 0, 6); gradient.addColorStop(0, '#789247'); gradient.addColorStop(.45, '#435f28'); gradient.addColorStop(.5, '#96a96a'); gradient.addColorStop(1, '#293e1e'); ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(leafSize * .35, -leafSize * .4, leafSize * .85, -leafSize * .18, leafSize, 0); ctx.bezierCurveTo(leafSize * .65, leafSize * .3, leafSize * .25, leafSize * .22, 0, 0); ctx.fill();
    ctx.strokeStyle = '#b2ba7b66'; ctx.lineWidth = .5;
    for (let j = 1; j < 6; j++) { const u = j / 7; ctx.beginPath(); ctx.moveTo(leafSize * u, 0); ctx.lineTo(leafSize * (u + .15), -Math.sin(u * Math.PI) * leafSize * .18); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
