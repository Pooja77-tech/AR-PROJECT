export const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function cropTransform(sw, sh, width, height, mirror) {
  const scale = Math.max(width / sw, height / sh);
  const dx = (width - sw * scale) / 2, dy = (height - sh * scale) / 2;
  return { dx, dy, scale, map: p => ({ x: mirror ? width - (p.x * sw * scale + dx) : p.x * sw * scale + dx, y: p.y * sh * scale + dy }) };
}
export function analyzeHand(points) {
  const size = Math.max(distance(points[0], points[9]), 1);
  const palm = [0, 5, 9, 13, 17].reduce((p, i) => ({ x: p.x + points[i].x / 5, y: p.y + points[i].y / 5 }), { x: 0, y: 0 });
  const openness = [8, 12, 16, 20].reduce((sum, tip) => sum + clamp((distance(points[tip], points[0]) / Math.max(distance(points[tip - 2], points[0]), 1) - 1.05) / .65), 0) / 4;
  return { palm, size, openness, pinch: distance(points[4], points[8]) / size, tap: distance(points[4], points[12]) / size, angle: Math.atan2(points[9].y - points[0].y, points[9].x - points[0].x) + Math.PI / 2 };
}
