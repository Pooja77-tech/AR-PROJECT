import * as THREE from 'three';
import { createPetalGeometry, createPetalTextures, petalLayout } from './botanicalGeometry.js';

const MAX_FLOWERS = 12;

// Keep the model's contact point at the tracked pixel regardless of scale/tilt.
export function attachFlowerToPalm(root, flower, width, height, bouquet) {
  root.rotation.set(flower.tiltX ?? 0, flower.tiltY ?? 0, -(flower.angle ?? 0));
  root.scale.setScalar(flower.size * .8);
  const contact = bouquet ? new THREE.Vector3(0, -1.4, -.16) : new THREE.Vector3();
  contact.multiply(root.scale).applyEuler(root.rotation);
  root.position.set(flower.x - width / 2, height / 2 - flower.y, 0).sub(contact);
}

function addDissolve(material, uniform) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uDissolve = uniform;
    shader.vertexShader = 'varying vec2 vBotanicalUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvBotanicalUv = uv;');
    shader.fragmentShader = 'uniform float uDissolve;\nvarying vec2 vBotanicalUv;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat grain = fract(sin(dot(floor(vBotanicalUv * 160.0), vec2(12.9898,78.233))) * 43758.5453);\nif (grain < uDissolve) discard;');
  };
  material.customProgramCacheKey = () => 'botanical-dissolve-v1';
}

function tube(a, b, radius, material) {
  const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, .5).add(new THREE.Vector3(.08, 0, .04)), b]);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 7, false), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function createBotanicalModel(style, color, density, bouquet) {
  const root = new THREE.Group(), heads = [], petals = [], uniform = { value: 0 };
  const textures = createPetalTextures(style, color);
  const leafTextures = createPetalTextures('leaf', '#678640');
  const petalMaterial = new THREE.MeshPhysicalMaterial({ map: textures.map, bumpMap: textures.bump, bumpScale: .018, roughness: .59, metalness: 0, side: THREE.DoubleSide, sheen: .28, sheenColor: new THREE.Color('#fff3df'), sheenRoughness: .75, clearcoat: .025 });
  // Thin petal back faces receive a small warm fill, without neon emission.
  addDissolve(petalMaterial, uniform);
  const green = new THREE.MeshStandardMaterial({ map: leafTextures.map, bumpMap: leafTextures.bump, bumpScale: .012, roughness: .68, side: THREE.DoubleSide });
  const filament = new THREE.MeshStandardMaterial({ color: '#d6d9a2', roughness: .7 });
  const pollen = new THREE.MeshStandardMaterial({ color: style === 'lily' ? '#8c451e' : '#c69a2e', roughness: .93 });
  for (const mat of [green, filament, pollen]) addDissolve(mat, uniform);
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }); addDissolve(depth, uniform);
  const petalGeometry = createPetalGeometry(style), leafGeometry = createPetalGeometry('lily');
  const headPositions = bouquet ? [[0, 0, 0, 1, 1], [-1.0, .62, -.18, .7, .67], [.85, .95, -.26, .52, .16]] : [[0, 0, 0, 1, 1]];
  headPositions.forEach(([x, y, z, scale, stage], index) => {
    const head = new THREE.Group(); head.position.set(x, y, z); head.scale.setScalar(scale);
    head.rotation.set(index === 1 ? .24 : -.1, index === 1 ? -.4 : .15, index * .27); root.add(head);
    heads.push({ head, stage });
    for (const shape of petalLayout(style, density)) {
      const mesh = new THREE.Mesh(petalGeometry, petalMaterial);
      mesh.rotation.z = shape.angle; mesh.scale.set(shape.scale * (1 + .03 * Math.sin(shape.angle * 17)), shape.scale, shape.scale); mesh.position.z = shape.height;
      mesh.castShadow = mesh.receiveShadow = true; mesh.customDepthMaterial = depth;
      mesh.userData.openness = shape.openness * stage; mesh.morphTargetInfluences[0] = mesh.userData.openness;
      head.add(mesh); petals.push(mesh);
    }
    const stamenGroup = new THREE.Group(); head.add(stamenGroup); heads[heads.length - 1].stamens = stamenGroup;
    if (style === 'lily' || style === 'sakura') {
      for (let i = 0; i < (style === 'lily' ? 6 : 18); i++) {
        const a = i * 2.39996, reach = style === 'lily' ? .38 : .15;
        const end = new THREE.Vector3(Math.cos(a) * reach, Math.sin(a) * reach, style === 'lily' ? .52 : .16);
        stamenGroup.add(tube(new THREE.Vector3(0, 0, .02), end, style === 'lily' ? .012 : .006, filament));
        const anther = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), pollen); anther.scale.set(style === 'lily' ? .09 : .018, .025, .022); anther.position.copy(end); anther.rotation.z = a; stamenGroup.add(anther);
      }
    } else if (style !== 'rose') {
      const florets = new THREE.InstancedMesh(new THREE.SphereGeometry(.017, 6, 5), pollen, 110);
      const transform = new THREE.Matrix4();
      for (let i = 0; i < 110; i++) {
        const r = Math.sqrt(i / 110) * .2, a = i * 2.39996;
        transform.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, .12 + .06 * (1 - r / .2)); florets.setMatrixAt(i, transform);
      }
      stamenGroup.add(florets);
    }
    if (bouquet) root.add(tube(new THREE.Vector3(0, -1.4, -.16), new THREE.Vector3(x, y, z - .02), .026 - index * .003, green));
  });
  if (bouquet) for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(leafGeometry, green); leaf.morphTargetInfluences[0] = .9; leaf.scale.set(.38, .7, .5); leaf.position.set(0, -1.2 + i * .24, -.15); leaf.rotation.set(.2, i % 2 ? .6 : -.6, i % 2 ? -1 : 1); root.add(leaf);
  }
  root.traverse(object => { if (object.isMesh) { object.customDepthMaterial = depth; object.castShadow = true; object.receiveShadow = true; } });

  // Surface samples retain their original anchors: opening the pinch reverses
  // the same displacement field so the flower reforms even while the hand moves.
  const count = bouquet ? 2600 : 1100, samples = [], positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const pointColor = new THREE.Color(color), white = new THREE.Color('#fff3e8');
  for (let i = 0; i < count; i++) {
    const mesh = petals[i % petals.length];
    const index = Math.floor((Math.sin(i * 47.13) * 43758.54 % 1 + 1) % 1 * mesh.geometry.attributes.position.count);
    samples.push({ mesh, index, seed: i * 2.39996 });
    const tint = white.clone().lerp(pointColor, .15 + (i % 17) / 22); colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const cloudGeometry = new THREE.BufferGeometry(); cloudGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); cloudGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cloudMaterial = new THREE.PointsMaterial({ size: .014, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
  cloudMaterial.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nvec2 petal = gl_PointCoord - 0.5;\nif (dot(petal * vec2(1.0,1.7), petal * vec2(1.0,1.7)) > 0.23) discard;'); };
  const cloud = new THREE.Points(cloudGeometry, cloudMaterial); cloud.frustumCulled = false;
  // Cloud is in root-local coordinates, separate from head rotations.
  root.add(cloud);
  const point = new THREE.Vector3(), inverse = new THREE.Matrix4(), localMatrix = new THREE.Matrix4();
  return {
    root,
    update(bloom, dissolve, seconds, intensity) {
      uniform.value = dissolve;
      petals.forEach(petal => { petal.morphTargetInfluences[0] = Math.max(.04, bloom * petal.userData.openness); });
      heads.forEach(({ stamens, stage }) => { stamens.scale.setScalar(Math.max(.015, bloom * stage)); });
      cloud.visible = dissolve > .005; cloudMaterial.opacity = Math.min(1, dissolve * 2); cloudMaterial.size = .04 * root.scale.x;
      cloudGeometry.setDrawRange(0, Math.round(count * (.3 + intensity * .7)));
      if (cloud.visible) {
        root.updateMatrixWorld(true); inverse.copy(root.matrixWorld).invert();
        let previousMesh;
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i];
          if (previousMesh !== sample.mesh) { localMatrix.multiplyMatrices(inverse, sample.mesh.matrixWorld); previousMesh = sample.mesh; }
          sample.mesh.getVertexPosition(sample.index, point); point.applyMatrix4(localMatrix);
          const drift = dissolve * dissolve;
          point.x += drift * (Math.sin(sample.seed) * 1.6 + Math.sin(seconds * .5 + sample.seed) * .22);
          point.y += drift * (Math.cos(sample.seed * .73) * 1.6 + .5);
          point.z += drift * Math.sin(sample.seed * .31) * .8;
          positions.set([point.x, point.y, point.z], i * 3);
        }
        cloudGeometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      const geometries = new Set(), materials = new Set();
      root.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); depth.dispose(); textures.map.dispose(); textures.bump.dispose(); leafTextures.map.dispose(); leafTextures.bump.dispose(); leafGeometry.dispose();
    },
  };
}

export function createBotanicalRenderer() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.debug.onShaderError = (gl, program) => { throw new Error(`Botanical shader failed to link: ${gl.getProgramInfoLog(program)}`); };
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 10000);
  scene.add(new THREE.HemisphereLight('#fff5e6', '#475049', 2));
  const key = new THREE.DirectionalLight('#fff0dc', 2.6); key.position.set(-250, 400, 550); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0003; key.shadow.normalBias = .5; scene.add(key);
  const rim = new THREE.DirectionalLight('#e5eeff', .7); rim.position.set(300, -40, 200); scene.add(rim);
  const models = []; let signature = '', width = 0, height = 0;
  return {
    render(ctx, blooms, settings, now, lighting = 1) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      if (w !== width || h !== height) {
        width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h;
        camera.position.z = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); camera.updateProjectionMatrix();
        Object.assign(key.shadow.camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2, far: 2000 }); key.shadow.camera.updateProjectionMatrix();
      }
      const next = `${settings.style}-${settings.color}-${settings.petals}-${settings.mode}-${settings.bouquet}`;
      if (next !== signature) { models.forEach(model => { scene.remove(model.root); model.dispose(); }); models.length = 0; signature = next; }
      while (models.length < Math.min(blooms.length, MAX_FLOWERS)) { const model = createBotanicalModel(settings.style, settings.color, settings.petals, settings.mode === 'palm' && settings.bouquet); scene.add(model.root); models.push(model); }
      models.forEach((model, i) => {
        const flower = blooms[i]; model.root.visible = !!flower && flower.size > .01;
        if (!model.root.visible) return;
        attachFlowerToPalm(model.root, flower, w, h, settings.mode === 'palm' && settings.bouquet);
        model.update(flower.strength, flower.dissolve || 0, now / 1000, settings.particles);
      });
      renderer.toneMappingExposure = (.8 + lighting * .35) * (.85 + settings.glow * .3);
      renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
    },
    dispose() { models.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
