export const DEFAULTS = { bloom: .95, grow: .9, flowerSize: 2, glow: .5, color: '#d877a0', showLandmarks: false, mode: 'palm', style: 'lily', bouquet: true, petals: 8, gestures: true, vines: true, trails: false, particles: .7, wildlife: 'none', background: 'camera', occlusion: true, fps: 30, countdown: 3, format: 'auto', hideControls: true };
export const PRESETS = {
  'Stargazer lilies': { color: '#ce5887', style: 'lily' },
  'Ivory lilies': { color: '#f1eadc', style: 'lily' },
  'Garden roses': { color: '#b84865', style: 'rose', bloom: .86 },
  'Pink lotus': { color: '#dd95a7', style: 'lotus', bloom: .85 },
  'Meadow daisies': { color: '#fff5e4', style: 'daisy' },
  'Cherry blossom': { color: '#f1b8c8', style: 'sakura', petals: 5 },
};
export function sanitizeSettings(value) {
  const result = { ...DEFAULTS };
  if (!value || typeof value !== 'object') return result;
  for (const key of Object.keys(DEFAULTS)) if (typeof value[key] === typeof DEFAULTS[key]) result[key] = value[key];
  for (const key of ['bloom', 'grow', 'glow', 'particles']) result[key] = Number.isFinite(result[key]) ? Math.max(0, Math.min(1, result[key])) : DEFAULTS[key];
  result.flowerSize = Number.isFinite(result.flowerSize) ? Math.max(.75, Math.min(3, result.flowerSize)) : DEFAULTS.flowerSize;
  for (const [key, choices] of Object.entries({ mode: ['palm', 'fingers'], style: ['lily', 'rose', 'lotus', 'daisy', 'sakura', 'fantasy'], wildlife: ['none', 'fireflies', 'butterflies'], background: ['camera', 'blur', 'night'], fps: [15, 30, 60], countdown: [0, 3, 5], format: ['auto', 'webm', 'mp4'] })) if (!choices.includes(result[key])) result[key] = DEFAULTS[key];
  result.petals = Number.isFinite(result.petals) ? Math.round(Math.max(4, Math.min(16, result.petals))) : 8;
  if (!/^#[0-9a-f]{6}$/i.test(result.color)) result.color = DEFAULTS.color;
  return result;
}
export function readSaved(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
