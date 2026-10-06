import { useEffect, useState } from 'react';
import CameraStage from './components/CameraStage.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import { DEFAULTS, readSaved, sanitizeSettings } from './utils/settings.js';
export default function App() {
  const [settings, setSettings] = useState(() => sanitizeSettings(readSaved('bloom-settings-botanical', DEFAULTS)));
  const [recording, setRecording] = useState(false);
  const [tutorial, setTutorial] = useState(() => !readSaved('bloom-tutorial', false));
  const [notice, setNotice] = useState('');
  useEffect(() => { try { localStorage.setItem('bloom-settings-botanical', JSON.stringify(settings)); } catch { setNotice('Settings cannot be saved in this browser session.'); } }, [settings]);
  const update = (key, value) => setSettings(current => sanitizeSettings({ ...current, [key]: value }));
  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">✣</span>BLOOM <i>AR</i></a><button className="text-button" onClick={() => setTutorial(true)}>How to play</button></header>
    <main className="workspace" id="top">
      <section className="intro"><p className="eyebrow">A BOTANICAL STUDY IN MOTION</p><h1>Make something <em>bloom.</em></h1><p className="lede">Hold a living bouquet. Pinch to dissolve its petals; release to bring them back.</p></section>
      {tutorial && <section className="tutorial"><div><b>A garden in your hands</b><p>Open palm: bloom · Fist: close · Hold thumb + index pinch: dissolve · Release pinch: reform · Thumb + middle tap: change color. Bring two palms together for a shared bouquet.</p><small>Keep your whole hand visible. Demo shows the bloom → dissolve → reform cycle automatically. Three-dimensional procedural flowers; hand masking remains approximate.</small></div><button onClick={() => { setTutorial(false); try { localStorage.setItem('bloom-tutorial', 'true'); } catch { /* Optional persistence */ } }}>Got it</button></section>}
      {notice && <p role="status">{notice}</p>}
      <div className={`studio-grid ${recording && settings.hideControls ? 'cinema' : ''}`}><CameraStage settings={settings} update={update} onRecordingChange={setRecording} /><ControlPanel settings={settings} update={update} apply={patch => setSettings(current => sanitizeSettings({ ...current, ...patch }))} /></div>
    </main><footer>Your camera stays on this device. Captures are stored in this browser until you delete them.</footer>
  </div>;
}
