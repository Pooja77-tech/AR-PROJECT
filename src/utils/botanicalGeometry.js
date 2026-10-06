import * as THREE from 'three';

export const FLOWER_STYLES = ['lily', 'rose', 'lotus', 'daisy', 'sakura', 'fantasy'];

// Smooth curved surfaces, not flat polygon fans. Each petal morphs from a bud
// into a cupped, recurved surface, retaining its own UV coordinates and veins.
export function createPetalGeometry(style = 'lily') {
  const positions = [], open = [], uvs = [], indices = [];
  const rows = 32, columns = 14;
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    for (let i = 0; i <= columns; i++) {
      const u = i / columns * 2 - 1;
      const profile = Math.pow(Math.max(.0001, Math.sin(Math.PI * t)), style === 'lily' ? .8 : .55);
      const width = style === 'daisy' ? .11 : style === 'rose' ? .53 : style === 'sakura' ? .44 : .32;
      const x = u * width * profile * (1 + .045 * Math.sin(t * 33 + u * 9));
      const notch = style === 'sakura' ? .1 * Math.exp(-u * u * 45) * Math.pow(t, 12) : 0;
      const y = .08 + 1.3 * t - notch;
      const cup = style === 'lotus' || style === 'rose' ? .55 : .28;
      const z = cup * Math.sin(Math.PI * t) + u * u * .15 * profile - (style === 'lily' ? .27 : .08) * Math.pow(t, 5) + .012 * Math.sin(t * 29 + u * 7) * Math.abs(u);
      open.push(x, y, z);
      positions.push(x * .24, .06 + Math.sin(Math.PI * t) * .17, t * .9 + u * u * .025);
      uvs.push(i / columns, t);
      if (j < rows && i < columns) { const a = j * (columns + 1) + i, b = a + columns + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const expanded = geometry.clone(); expanded.setAttribute('position', new THREE.Float32BufferAttribute(open, 3)); expanded.computeVertexNormals();
  geometry.morphAttributes.position = [expanded.attributes.position.clone()];
  geometry.morphAttributes.normal = [expanded.attributes.normal.clone()];
  expanded.dispose(); geometry.computeBoundingSphere();
  return geometry;
}

export function createPetalTextures(style, hex) {
  const size = 256, color = new THREE.Color(hex);
  // Data textures use sRGB bytes; convert THREE's linear color back to sRGB first.
  const rgb = color.clone().convertLinearToSRGB();
  const pixels = new Uint8Array(size * size * 4), relief = new Uint8Array(pixels.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1) * 2 - 1, t = y / (size - 1), offset = (y * size + x) * 4;
    const random = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const grain = (random - Math.floor(random) - .5) * .025;
    const veins = Math.pow(.5 + .5 * Math.cos(u * 65 + Math.sin(t * 9) * 2 + t * 7), 18);
    const stripe = Math.exp(-u * u * 7) * Math.sin(Math.PI * t * .85);
    let pigment = style === 'lily' ? .16 + stripe * .67 : style === 'daisy' ? .18 : .5 + stripe * .3;
    const speckle = style === 'lily' && t > .2 && t < .65 && Math.abs(u) < .75 && random - Math.floor(random) > .987;
    if (speckle) pigment = 1;
    const base = style === 'leaf' ? [.2, .32, .09] : [1, .965, .91], tint = [rgb.r, rgb.g, rgb.b];
    for (let c = 0; c < 3; c++) {
      let value = base[c] * (1 - pigment) + tint[c] * pigment;
      value -= veins * .045; value += grain;
      if (style === 'leaf') value += Math.exp(-u * u * 500) * .13 + Math.pow(.5 + .5 * Math.cos(t * 90 - Math.abs(u) * 14), 24) * .025;
      if (speckle) value *= .45;
      if (t < .12) value *= c === 1 ? 1 : .83 + t;
      pixels[offset + c] = Math.max(0, Math.min(255, value * 255));
      relief[offset + c] = Math.round(128 + veins * 50 + grain * 600);
    }
    pixels[offset + 3] = relief[offset + 3] = 255;
  }
  const map = new THREE.DataTexture(pixels, size, size); map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.DataTexture(relief, size, size);
  for (const texture of [map, bump]) { texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true; }
  return { map, bump };
}

export function petalLayout(style, density = 8) {
  const rings = style === 'rose' ? [density + 6, density + 3, density, 6, 4] : style === 'lotus' ? [density + 4, density, 6] : style === 'lily' ? [3, 3] : style === 'daisy' ? [density + 12, density + 9] : style === 'sakura' ? [5] : [density + 4, density, 5];
  return rings.flatMap((count, ring) => Array.from({ length: count }, (_, i) => ({
    angle: i / count * Math.PI * 2 + ring * (style === 'lily' ? Math.PI / 3 : .33),
    scale: style === 'lily' ? 1 - ring * .08 : Math.pow(.76, ring),
    height: ring * .055,
    openness: style === 'rose' ? 1 - ring * .13 : 1 - ring * .04,
  })));
}
