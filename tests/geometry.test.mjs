import test from 'node:test';
import assert from 'node:assert/strict';
import { cropTransform, analyzeHand } from '../src/utils/gestures.js';
import { sanitizeSettings } from '../src/utils/settings.js';
test('portrait cover crop aligns mirrored camera center and edges', () => {
  const transform = cropTransform(1280, 720, 400, 600, true);
  assert.deepEqual(transform.map({ x: .5, y: .5 }), { x: 200, y: 300 });
  const left = transform.map({ x: 0, y: 0 });
  assert.ok(left.x > 400); assert.equal(left.y, 0);
  const normal = cropTransform(1280, 720, 400, 600, false);
  assert.ok(Math.abs(normal.map({ x: .25, y: .7 }).x + transform.map({ x: .25, y: .7 }).x - 400) < .0001);
});
test('gesture openness distinguishes extended and folded fingers at different scales', () => {
  const makeHand = (open, scale) => {
    const p = Array.from({ length: 21 }, () => ({ x: 0, y: 0 })); p[0] = { x: 0, y: 100 * scale };
    for (const base of [5, 9, 13, 17]) { p[base] = { x: (base - 9) * scale, y: 50 * scale }; p[base + 1] = { x: (base - 9) * scale, y: 30 * scale }; p[base + 3] = { x: (base - 9) * scale, y: (open ? -30 : 60) * scale }; }
    return p;
  };
  for (const scale of [.5, 1, 2]) { assert.ok(analyzeHand(makeHand(true, scale)).openness > .9); assert.equal(analyzeHand(makeHand(false, scale)).openness, 0); }
});
test('corrupt persisted controls cannot feed invalid sizes or styles into renderer', () => {
  const settings = sanitizeSettings({ petals: Infinity, bloom: 12, grow: -2, style: 'unknown', color: 'invalid', fps: 9 });
  assert.equal(settings.petals, 8); assert.equal(settings.bloom, 1); assert.equal(settings.grow, 0); assert.equal(settings.style, 'lily'); assert.equal(settings.fps, 30);
});
