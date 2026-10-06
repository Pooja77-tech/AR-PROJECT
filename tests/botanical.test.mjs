import test from 'node:test';
import assert from 'node:assert/strict';
import { FLOWER_STYLES, createPetalGeometry, petalLayout } from '../src/utils/botanicalGeometry.js';
import { createBotanicalModel, attachFlowerToPalm } from '../src/utils/botanicalRenderer.js';
import { Group, Vector3, PerspectiveCamera } from 'three';

test('palm contact stays on the tracked pixel through rotation, scaling and viewport changes', () => {
  for (const [width, height] of [[1280, 720], [400, 700]]) {
    const camera = new PerspectiveCamera(38, width / height, .1, 10000);
    camera.position.z = height / (2 * Math.tan(38 * Math.PI / 360)); camera.updateMatrixWorld();
    for (const bouquet of [true, false]) for (const size of [5, 50, 140]) for (const angle of [-1.2, 0, 1.4]) {
      const root = new Group();
      const flower = { x: width * .23, y: height * .64, tiltX: .6, tiltY: -.7, angle, size };
      attachFlowerToPalm(root, flower, width, height, bouquet); root.updateMatrixWorld();
      const contact = bouquet ? new Vector3(0, -1.4, -.16) : new Vector3();
      contact.applyMatrix4(root.matrixWorld).project(camera);
      assert.ok(Math.abs((contact.x + 1) * width / 2 - flower.x) < .00001);
      assert.ok(Math.abs((1 - contact.y) * height / 2 - flower.y) < .00001);
    }
  }
});

test('all species have curved, finite geometry and matching bud/open morph topology', () => {
  for (const style of FLOWER_STYLES) {
    const g = createPetalGeometry(style);
    assert.equal(g.attributes.position.count, g.morphAttributes.position[0].count);
    assert.equal(g.attributes.normal.count, g.morphAttributes.normal[0].count);
    for (const attribute of [g.attributes.position, g.attributes.normal, g.morphAttributes.position[0], g.morphAttributes.normal[0]]) assert.ok(attribute.array.every(Number.isFinite), style);
    const zs = Array.from(g.morphAttributes.position[0].array).filter((_, i) => i % 3 === 2);
    assert.ok(Math.max(...zs) - Math.min(...zs) > .1, `${style} must not be flat`);
    assert.ok(g.index.array.every(i => i < g.attributes.position.count));
    g.dispose();
  }
  assert.equal(petalLayout('lily', 16).length, 6);
  assert.equal(petalLayout('sakura', 16).length, 5);
});

test('surface cloud remains finite through dissolve/reform and transformed hand anchors', () => {
  for (const style of FLOWER_STYLES) {
    const model = createBotanicalModel(style, '#d877a0', 8, true);
    model.root.position.set(100, 200, 0); model.root.scale.setScalar(70); model.root.rotation.set(.2, -.3, .1);
    for (const dissolve of [0, .5, 1, .5, 0]) {
      model.update(.9, dissolve, 2, .7);
      model.root.traverse(object => { if (object.isPoints && object.visible) assert.ok(object.geometry.attributes.position.array.every(Number.isFinite), style); });
    }
    model.root.traverse(object => { if (object.isPoints) assert.equal(object.visible, false); });
    model.dispose();
  }
});
