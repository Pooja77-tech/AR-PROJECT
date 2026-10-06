import { useCallback, useEffect, useRef, useState } from 'react';
import FlowerCanvas from './FlowerCanvas.jsx';
import { useHandTracking } from '../hooks/useHandTracking.js';
import { gallery } from '../utils/gallery.js';

function CaptureCard({ item, onDelete, onError }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(item.blob); setUrl(value); return () => URL.revokeObjectURL(value); }, [item.blob]);
  async function share() {
    const file = new File([item.blob], item.name, { type: item.blob.type });
    try { if (!navigator.canShare?.({ files: [file] })) { onError('File sharing is unavailable here. Use Download instead.'); return; } await navigator.share({ files: [file], title: 'My Bloom AR garden' }); } catch (e) { if (e.name !== 'AbortError') onError('Sharing failed. You can still download your capture.'); }
  }
  return <article className="capture-card">{item.blob.type.startsWith('image') ? <img src={url} alt="Your captured garden" /> : <video src={url} controls playsInline preload="metadata" />}<small>{new Date(item.created).toLocaleString()} · {(item.blob.size / 1024 / 1024).toFixed(1)} MB</small><div className="capture-actions"><a href={url} download={item.name}>Download</a><button onClick={share}>Share</button><button onClick={() => onDelete(item.id)}>Delete</button></div></article>;
}
export default function CameraStage({ settings, update, onRecordingChange }) {
  const videoRef = useRef(null), canvasRef = useRef(null), stageRef = useRef(null);
  const streamRef = useRef(null), recorderRef = useRef(null), captureRef = useRef(null), micRef = useRef(null), audioRef = useRef(null), beatRef = useRef(0);
  const mounted = useRef(true), requestId = useRef(0), countdownRef = useRef(null), pendingRef = useRef(false), busyRef = useRef(false);
  const [camera, setCamera] = useState('idle'), [demo, setDemo] = useState(false), [mirror, setMirror] = useState(true);
  const [facing, setFacing] = useState('user'), [error, setError] = useState(''), [stats, setStats] = useState({ fps: 0, hands: 0, gesture: '' });
  const [recordState, setRecordState] = useState('idle'), [seconds, setSeconds] = useState(0), [countdown, setCountdown] = useState(0);
  const [mic, setMic] = useState(false), [music, setMusic] = useState(false), [audioBusy, setAudioBusy] = useState(false), [items, setItems] = useState([]);
  const { resultsRef, status, error: trackingError } = useHandTracking(videoRef, camera === 'ready' && !demo, settings.fps);
  const capturing = recordState !== 'idle';
  const ready = camera === 'ready' || demo;
  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => {
    const cancellation = requestId;
    mounted.current = true;
    gallery('list').then(saved => { if (mounted.current) setItems(saved.sort((a, b) => b.created - a.created)); }).catch(() => { if (mounted.current) setError('Gallery storage is unavailable. New captures will remain downloadable for this session.'); });
    return () => {
      mounted.current = false; cancellation.current++; clearInterval(countdownRef.current); pendingRef.current = false;
      const recorder = recorderRef.current; if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
      captureRef.current?.getTracks().forEach(t => t.stop()); stopStream(); micRef.current?.getTracks().forEach(t => t.stop()); audioRef.current?.close();
    };
  }, []);
  useEffect(() => { onRecordingChange(capturing); }, [capturing, onRecordingChange]);
  useEffect(() => { if (recordState !== 'recording') return; const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer); }, [recordState]);
  useEffect(() => {
    if (!music || !audioRef.current || !micRef.current) { beatRef.current = 0; return; }
    const context = audioRef.current, source = context.createMediaStreamSource(micRef.current), analyser = context.createAnalyser();
    analyser.fftSize = 256; source.connect(analyser); const data = new Uint8Array(analyser.frequencyBinCount); let frame;
    function sample() { analyser.getByteFrequencyData(data); beatRef.current = data.slice(0, 24).reduce((a, b) => a + b, 0) / (24 * 255); frame = requestAnimationFrame(sample); }
    sample(); return () => { cancelAnimationFrame(frame); source.disconnect(); analyser.disconnect(); beatRef.current = 0; };
  }, [music]);
  async function enableAudio() {
    if (audioBusy || capturing || pendingRef.current) return;
    if (mic) { setMusic(false); setMic(false); micRef.current?.getTracks().forEach(t => t.stop()); micRef.current = null; await audioRef.current?.close(); audioRef.current = null; return; }
    setAudioBusy(true);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; } const context = new AudioContext(); await context.resume(); micRef.current = stream; audioRef.current = context; setMic(true); setError(''); } catch { stream?.getTracks().forEach(t => t.stop()); setError('Microphone unavailable or permission denied. Video still works without audio.'); } finally { if (mounted.current) setAudioBusy(false); }
  }
  async function startCamera(mode = facing) {
    if (busyRef.current || capturing || pendingRef.current) return;
    busyRef.current = true; const id = ++requestId.current; setCamera('starting'); setDemo(false); setError(''); stopStream();
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Use localhost or HTTPS to access your camera.');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!mounted.current || id !== requestId.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream; videoRef.current.srcObject = stream; await videoRef.current.play();
      if (!mounted.current || id !== requestId.current) { stream.getTracks().forEach(t => t.stop()); return; }
      stream.getVideoTracks()[0].onended = () => { if (mounted.current) { clearInterval(countdownRef.current); pendingRef.current = false; setCountdown(0); if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); setCamera('error'); setError('Camera disconnected. Reconnect it and try again.'); } };
      setFacing(mode); setMirror(mode === 'user'); setCamera('ready');
    } catch (e) { stream?.getTracks().forEach(t => t.stop()); if (mounted.current) { setCamera('error'); setError(e.name === 'NotAllowedError' ? 'Camera access denied. Allow camera access in your browser and try again.' : e.message || 'Camera unavailable.'); } } finally { busyRef.current = false; }
  }
  function stopCamera() { if (capturing || pendingRef.current) return; requestId.current++; stopStream(); videoRef.current.srcObject = null; setCamera('idle'); setDemo(false); }
  async function save(blob) {
    if (!blob?.size) { setError('Capture was empty. Please try again.'); return; }
    const extension = blob.type.startsWith('image') ? 'png' : blob.type.includes('mp4') ? 'mp4' : 'webm';
    const item = { id: crypto.randomUUID(), blob, name: `bloom-${Date.now()}.${extension}`, created: Date.now() };
    setItems(current => [item, ...current]);
    try { await gallery('save', item); } catch { setError('Capture is ready to download, but browser storage is full or unavailable.'); }
  }
  async function remove(id) { try { await gallery('delete', id); setItems(current => current.filter(item => item.id !== id)); } catch { setError('Could not remove the saved capture.'); } }
  function beginRecording() {
    let capture;
    try {
      if (!window.MediaRecorder || !canvasRef.current.captureStream) throw new Error('Recording is unavailable in this browser. Photos still work.');
      const candidates = settings.format === 'mp4' ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4'] : settings.format === 'webm' ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] : ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Selected video format is unsupported. Choose Best supported or WebM.');
      capture = canvasRef.current.captureStream(settings.fps);
      if (micRef.current) micRef.current.getAudioTracks().forEach(t => capture.addTrack(t.clone()));
      captureRef.current = capture;
      const recorder = new MediaRecorder(capture, { mimeType, videoBitsPerSecond: 6_000_000 }), chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => { if (mounted.current) setError('Recording failed. Try a different video format.'); if (recorder.state !== 'inactive') recorder.stop(); capture.getTracks().forEach(t => t.stop()); if (mounted.current) setRecordState('idle'); };
      recorder.onstop = () => { capture.getTracks().forEach(t => t.stop()); captureRef.current = null; if (mounted.current) { setRecordState('idle'); save(new Blob(chunks, { type: recorder.mimeType })); } };
      recorderRef.current = recorder; recorder.start(500); setRecordState('recording'); setSeconds(0); setError('');
    } catch (e) { capture?.getTracks().forEach(t => t.stop()); setError(e.message); setRecordState('idle'); }
  }
  function schedule(kind) {
    if (!ready || capturing || pendingRef.current) return;
    pendingRef.current = true;
    const execute = () => { pendingRef.current = false; setCountdown(0); if (kind === 'photo') canvasRef.current.toBlob(save, 'image/png'); else beginRecording(); };
    if (!settings.countdown) { execute(); return; }
    let remaining = settings.countdown; setCountdown(remaining);
    countdownRef.current = setInterval(() => { remaining--; setCountdown(remaining); if (remaining <= 0) { clearInterval(countdownRef.current); execute(); } }, 1000);
  }
  function cancelCountdown() { clearInterval(countdownRef.current); pendingRef.current = false; setCountdown(0); }
  function pause() { const recorder = recorderRef.current; if (recorder.state === 'recording') { recorder.pause(); setRecordState('paused'); } else if (recorder.state === 'paused') { recorder.resume(); setRecordState('recording'); } }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (stageRef.current.requestFullscreen) await stageRef.current.requestFullscreen(); else setError('Fullscreen is unavailable in this browser.'); } catch { setError('Could not enter fullscreen.'); } }
  const changeColor = useCallback(() => { const colors = ['#ff4775', '#b56cff', '#55cfff', '#ffdf5d', '#ff8547']; update('color', colors[(colors.indexOf(settings.color) + 1) % colors.length]); }, [settings.color, update]);
  return <div className="stage-column">
    <section className="stage-card" ref={stageRef}><video ref={videoRef} muted playsInline className="source-video" /><FlowerCanvas videoRef={videoRef} resultsRef={resultsRef} settings={settings} canvasRef={canvasRef} mirror={mirror} demo={demo} beatRef={beatRef} onGesture={changeColor} onStats={setStats} onError={setError} recording={capturing} />
      {!ready && <div className="start-overlay"><div className="orb"><span>✿</span></div><h2>Your hand is the canvas</h2><p>Open the camera or explore an animated garden with no camera required.</p><button className="primary-button" onClick={() => startCamera()} disabled={camera === 'starting'}>{camera === 'starting' ? 'Starting…' : 'Start camera'}</button><button disabled={camera === 'starting'} onClick={() => { stopStream(); setDemo(true); setCamera('idle'); setError(''); }}>Try demo</button></div>}
      {ready && <div className="stage-status"><span className="ready" />{demo ? 'DEMO' : status.toUpperCase()} · {stats.fps} FPS · {stats.gesture}</div>}
      {capturing && <div className="recording-pill">{recordState.toUpperCase()} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}<button onClick={() => recorderRef.current?.stop()}>Stop</button></div>}
      {countdown > 0 && <div className="countdown" role="status">{countdown}<button onClick={cancelCountdown}>Cancel</button></div>}
    </section>
    <div className="capture-toolbar"><button disabled={!ready || capturing || !!countdown} onClick={() => schedule('photo')}>Take photo</button>{capturing ? <><button onClick={pause}>{recordState === 'paused' ? 'Resume' : 'Pause'}</button><button className="primary-button" onClick={() => recorderRef.current?.stop()}>Stop & save</button></> : <button className="primary-button" disabled={!ready || !!countdown || audioBusy} onClick={() => schedule('video')}>Record</button>}<button onClick={fullscreen}>Fullscreen</button>
      {ready && <><button disabled={capturing || !!countdown || camera === 'starting'} onClick={() => startCamera(demo ? 'user' : facing === 'user' ? 'environment' : 'user')}>{demo ? 'Use camera' : 'Switch camera'}</button><button disabled={capturing || !!countdown} onClick={stopCamera}>Stop camera / demo</button><label><input type="checkbox" checked={mirror} onChange={e => setMirror(e.target.checked)} />Mirror</label></>}
    </div>
    <div className="audio-controls"><button disabled={audioBusy || capturing || !!countdown} onClick={enableAudio}>{audioBusy ? 'Requesting microphone…' : mic ? 'Disable microphone' : 'Enable microphone'}</button><label><input type="checkbox" disabled={!mic} checked={music} onChange={e => setMusic(e.target.checked)} />Music-reactive bloom</label><small>{mic ? 'Microphone audio is included in recordings.' : 'Optional microphone for audio recording and live music response.'}</small></div>
    {(error || trackingError) && <p role="alert" className="error-message">{error || trackingError}</p>}
    {!demo && ready && status === 'ready' && stats.hands === 0 && <p className="hint">Hold your whole hand in the frame with your palm facing the camera.</p>}
    <section className="gallery"><h2>Your captures <small>{items.length}</small></h2>{!items.length && <p>Photos and videos appear here, ready to preview, download or share.</p>}<div className="gallery-grid">{items.map(item => <CaptureCard key={item.id} item={item} onDelete={remove} onError={setError} />)}</div></section>
  </div>;
}
