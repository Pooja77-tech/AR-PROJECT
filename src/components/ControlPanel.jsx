import { useState } from 'react';
import { DEFAULTS, PRESETS, readSaved, sanitizeSettings } from '../utils/settings.js';
function Slider({ name, field, settings, update, max = 1, min = 0, step = .01, suffix = '' }) {
  return <label className="control-group"><span className="control-label">{name}<output>{settings[field]}{suffix}</output></span><input type="range" min={min} max={max} step={step} value={settings[field]} onChange={e => update(field, Number(e.target.value))} style={{ '--value': `${(settings[field] - min) / (max - min) * 100}%` }} /></label>;
}
function Select({ name, field, choices, settings, update }) {
  return <label className="select-control">{name}<select value={settings[field]} onChange={e => update(field, typeof settings[field] === 'number' ? Number(e.target.value) : e.target.value)}>{choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
}
export default function ControlPanel({ settings, update, apply }) {
  const [custom, setCustom] = useState(() => { const saved = readSaved('bloom-presets', []); return Array.isArray(saved) ? saved.filter(p => p && typeof p.name === 'string').slice(0, 10) : []; });
  const [name, setName] = useState(''); const [message, setMessage] = useState('');
  const shared = { settings, update };
  function save() {
    if (!name.trim()) { setMessage('Give your preset a name.'); return; }
    const next = [{ name: name.trim().slice(0, 40), settings }, ...custom.filter(p => p.name !== name.trim())].slice(0, 10);
    try { localStorage.setItem('bloom-presets', JSON.stringify(next)); setCustom(next); setName(''); setMessage('Preset saved.'); } catch { setMessage('Storage unavailable.'); }
  }
  return <aside className="controls-card"><div className="panel-heading"><div><p className="eyebrow">LIVE CONTROLS</p><h2>Shape the garden</h2></div><span className="sparkle">✦</span></div>
    <div className="preset-grid">{Object.entries(PRESETS).map(([label, value]) => <button key={label} onClick={() => apply({ ...DEFAULTS, ...value })}>{label}</button>)}</div>
    <Select {...shared} name="Placement" field="mode" choices={[["palm", "Palm bouquet"], ["fingers", "Fingertip flowers"]]} /><Select {...shared} name="Flower" field="style" choices={['lily', 'rose', 'lotus', 'daisy', 'sakura', 'fantasy'].map(s => [s, s === 'fantasy' ? 'Botanical hybrid' : s])} />
    <label className="check-control"><input type="checkbox" checked={settings.bouquet} onChange={e => update('bouquet', e.target.checked)} />Multi-stage bouquet (palm mode)</label>
    <Slider {...shared} name="Flower size" field="flowerSize" min={.75} max={3} step={.05} suffix="×" />
    <Slider {...shared} name="Bloom" field="bloom" /><Slider {...shared} name="Grow" field="grow" /><Slider {...shared} name="Petal light" field="glow" />
    <label className="select-control">Petal color<input aria-label="Petal color" type="color" value={settings.color} onChange={e => update('color', e.target.value)} /></label>
    <details open><summary>Movement & atmosphere</summary>{!['lily', 'sakura'].includes(settings.style) && <Slider {...shared} name="Petal density" field="petals" min={4} max={16} step={1} />}<Slider {...shared} name="Dissolve density" field="particles" /><Select {...shared} name="Visitors" field="wildlife" choices={['none', 'fireflies', 'butterflies'].map(s => [s, s])} /><Select {...shared} name="Background" field="background" choices={[["camera", "Camera"], ["blur", "Soft focus"], ["night", "Night garden"]]} />
    {Object.entries({ gestures: 'Gesture control', vines: 'Vines & leaves', trails: 'Motion trails', occlusion: 'Hand mask (approximate)', showLandmarks: 'Tracking mesh' }).map(([key, label]) => <label className="check-control" key={key}><input type="checkbox" checked={settings[key]} onChange={e => update(key, e.target.checked)} />{label}</label>)}</details>
    <details><summary>Capture & performance</summary><Select {...shared} name="Frame limit" field="fps" choices={[[15, '15 FPS · battery saver'], [30, '30 FPS · balanced'], [60, '60 FPS · smooth']]} /><Select {...shared} name="Countdown" field="countdown" choices={[[0, 'Off'], [3, '3 seconds'], [5, '5 seconds']]} /><Select {...shared} name="Video format" field="format" choices={[["auto", "Best supported"], ["webm", "WebM"], ["mp4", "MP4 (if supported)"]]} /><label className="check-control"><input type="checkbox" checked={settings.hideControls} onChange={e => update('hideControls', e.target.checked)} />Hide panel while recording</label><small>MP4 availability depends on your browser.</small></details>
    <details><summary>My presets</summary><input aria-label="Preset name" placeholder="Name your garden" maxLength={40} value={name} onChange={e => setName(e.target.value)} /><button onClick={save}>Save current look</button>{custom.map((p, i) => <button key={i} onClick={() => apply(sanitizeSettings(p.settings))}>{p.name}</button>)}<p role="status">{message}</p><button onClick={() => apply(DEFAULTS)}>Reset controls</button></details>
  </aside>;
}
