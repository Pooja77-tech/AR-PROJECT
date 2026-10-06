import { useEffect, useRef, useState } from 'react';
import { FINGER_TIPS, HAND_CONNECTIONS, drawStem } from '../utils/flower.js';
import { createBotanicalRenderer } from '../utils/botanicalRenderer.js';
import { analyzeHand, clamp, cropTransform, distance } from '../utils/gestures.js';

export default function FlowerCanvas({ videoRef, resultsRef, settings, canvasRef, mirror, demo, beatRef, onGesture, onStats, onError, recording }) {
  const [renderError, setRenderError] = useState('');
  const latest = useRef({ settings, mirror, demo, onGesture, onStats, onError, recording });
  useEffect(() => { latest.current = { settings, mirror, demo, onGesture, onStats, onError, recording }; });
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext('2d');
    const raw = document.createElement('canvas'), rawCtx = raw.getContext('2d');
    const mask = document.createElement('canvas'), maskCtx = mask.getContext('2d');
    const lightSample = document.createElement('canvas'); lightSample.width = lightSample.height = 8;
    const lightCtx = lightSample.getContext('2d', { willReadFrequently: true });
    let botanical, lighting = 1, lastLight = 0;
    try { botanical = createBotanicalRenderer(); } catch (error) { console.error(error); setRenderError('3D flowers require WebGL 2. Enable browser hardware acceleration and reload.'); }
    let frame, last = 0, lastStats = 0, frames = 0, joined = false;
    const tracks = new Map(), particles = [];
    function burst(p, count, color) {
      for (let i = 0; i < count; i++) particles.push({ ...p, vx: (Math.random() - .5) * 160, vy: -40 - Math.random() * 100, life: 2 + Math.random(), color, spin: Math.random() * 6 });
    }
    function render(now) {
      frame = requestAnimationFrame(render);
      const { settings: s, mirror: mirrored, demo: isDemo, recording: isRecording } = latest.current;
      if (now - last < 1000 / s.fps - 1) return;
      const dt = Math.min((now - last) / 1000 || .016, .05); last = now;
      const video = videoRef.current;
      // Fixed capture dimensions prevent resize/control changes from corrupting recordings.
      if (!isRecording) {
        const box = canvas.getBoundingClientRect(), ratio = box.width / box.height || 1.6;
        const w = Math.round(Math.min(1280, box.width * Math.min(devicePixelRatio || 1, 1.5)) / 2) * 2;
        const h = Math.round(w / ratio / 2) * 2;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = Math.max(w, 2); canvas.height = Math.max(h, 2); }
      }
      const w = canvas.width, h = canvas.height;
      for (const c of [raw, mask]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const transform = cropTransform(video?.videoWidth || w, video?.videoHeight || h, w, h, mirrored);
      rawCtx.clearRect(0, 0, w, h);
      if (!isDemo && video?.readyState >= 2) {
        rawCtx.save(); if (mirrored) { rawCtx.translate(w, 0); rawCtx.scale(-1, 1); }
        rawCtx.drawImage(video, transform.dx, transform.dy, video.videoWidth * transform.scale, video.videoHeight * transform.scale); rawCtx.restore();
      } else { rawCtx.fillStyle = '#140c19'; rawCtx.fillRect(0, 0, w, h); }
      ctx.clearRect(0, 0, w, h); ctx.save();
      if (s.background === 'blur') ctx.filter = 'blur(9px)';
      ctx.drawImage(raw, 0, 0); ctx.restore();
      if (s.background === 'night' || isDemo) { ctx.fillStyle = 'rgba(5,9,27,.8)'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 45; i++) { ctx.fillStyle = `rgba(190,215,255,${.3 + Math.sin(now / 1000 + i) * .2})`; ctx.fillRect((i * 137.3) % w, (i * 73.7) % h, 2, 2); } }
      const source = isDemo ? [] : resultsRef.current;
      const hands = source.map((hand, i) => {
        let points = hand.map(transform.map), info = analyzeHand(points);
        const detectedPalm = info.palm;
        // Nearest-palm association survives MediaPipe result order changes.
        let best, bestDistance = Infinity;
        for (const [id, track] of tracks) { const d = distance(track.palm, info.palm); if (track.seen !== now && d < bestDistance && d < info.size * 2) { best = id; bestDistance = d; } }
        const id = best ?? `${now}-${i}`;
        const prev = tracks.get(id) ?? { ...info, open: 0, pinch: false, tap: false, dissolve: 0, history: [] };
        if (prev.points) { const speed = distance(info.palm, prev.palm) / Math.max(dt, .001); const alpha = 1 - Math.exp(-dt * (28 + speed * .07)); points = points.map((p, index) => ({ x: prev.points[index].x + (p.x - prev.points[index].x) * alpha, y: prev.points[index].y + (p.y - prev.points[index].y) * alpha })); info = analyzeHand(points); }
        // Stabilize finger shape without delaying the whole hand's translation.
        const dx = detectedPalm.x - info.palm.x, dy = detectedPalm.y - info.palm.y;
        points = points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        info = analyzeHand(points);
        prev.open += (info.openness - prev.open) * (1 - Math.exp(-dt * 10));
        if (s.gestures) {
          if (info.pinch < .3 && !prev.pinch) prev.pinch = true;
          if (info.pinch > .48) prev.pinch = false;
          if (info.tap < .3 && !prev.tap) { latest.current.onGesture(); prev.tap = true; }
          if (info.tap > .48) prev.tap = false;
        }
        prev.dissolve += ((s.gestures && prev.pinch ? 1 : 0) - prev.dissolve) * (1 - Math.exp(-dt * 3));
        const palmWidth = Math.max(.01, Math.hypot(hand[5].x - hand[17].x, hand[5].y - hand[17].y));
        const tiltY = clamp((hand[5].z - hand[17].z) / palmWidth, -.8, .8) * (mirrored ? -1 : 1);
        const tiltX = clamp((hand[9].z - hand[0].z) / palmWidth, -.7, .7);
        Object.assign(prev, { palm: info.palm, points, seen: now }); tracks.set(id, prev);
        return { points, ...info, open: s.gestures ? Math.max(prev.open, prev.dissolve * .8) : 1, dissolve: prev.dissolve, tiltX, tiltY, history: prev.history };
      });
      for (const [id, track] of tracks) if (now - track.seen > 250) tracks.delete(id);
      if (isDemo) hands.push({ palm: { x: w * .5 + Math.sin(now / 3500) * w * .04, y: h * .69 }, size: Math.min(w * .15, h * .22), angle: Math.sin(now / 3800) * .12, tiltX: -.2, tiltY: Math.sin(now / 3000) * .35, dissolve: clamp((Math.sin(now / 2800) - .3) * 2), open: .95, points: null, history: [] });
      const merge = s.gestures && hands.length === 2 && distance(hands[0].palm, hands[1].palm) < (hands[0].size + hands[1].size) * .85;
      if (joined && !merge && hands.length === 2) burst({ x: (hands[0].palm.x + hands[1].palm.x) / 2, y: (hands[0].palm.y + hands[1].palm.y) / 2 }, 60, s.color);
      joined = merge;
      const blooms = [];
      for (const hand of hands) {
        const { palm, size, angle, open, points, history, dissolve, tiltX, tiltY } = hand;
        const strength = s.bloom * open;
        if (s.vines && points && s.mode === 'fingers') {
          for (const tip of FINGER_TIPS) { const p = points[tip]; const end = { x: p.x + Math.sin(now / 600 + tip) * size * .1, y: p.y }; ctx.globalAlpha = open; drawStem(ctx, points[0], end, s.grow, '#65c598'); ctx.globalAlpha = 1; }
        }
        const flowerPoints = s.mode === 'fingers' && points ? FINGER_TIPS.map(t => points[t]) : [palm];
        for (const p of flowerPoints) {
          if (s.vines && !s.bouquet) { ctx.globalAlpha = open * (1 - dissolve); drawStem(ctx, palm, p, 1, '#507b34'); ctx.globalAlpha = 1; }
          if (!merge && strength > .015) blooms.push({ ...p, size: clamp(size * (s.mode === 'palm' ? .8 : .3), 8, 140) * s.grow * Math.sqrt(open), angle, strength, dissolve, tiltX, tiltY });
        }
        if (s.trails && open > .1) history.push({ ...flowerPoints[0], time: now });
        while (history.length && now - history[0].time > 600) history.shift();
        if (s.trails) history.forEach(p => { ctx.globalAlpha = (1 - (now - p.time) / 600) * .25; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
      }
      // Restore camera pixels through a landmark-derived hand silhouette, above vines.
      maskCtx.clearRect(0, 0, w, h); maskCtx.fillStyle = '#fff'; maskCtx.strokeStyle = '#fff';
      for (const { points, size } of hands) if (points) {
        maskCtx.beginPath(); [0, 1, 5, 9, 13, 17].forEach((i, n) => n ? maskCtx.lineTo(points[i].x, points[i].y) : maskCtx.moveTo(points[i].x, points[i].y)); maskCtx.closePath(); maskCtx.fill();
        maskCtx.lineCap = 'round'; maskCtx.lineJoin = 'round'; maskCtx.lineWidth = size * .15;
        for (const [a, b] of HAND_CONNECTIONS) { maskCtx.beginPath(); maskCtx.moveTo(points[a].x, points[a].y); maskCtx.lineTo(points[b].x, points[b].y); maskCtx.stroke(); }
      }
      if (s.occlusion || s.background !== 'camera') { maskCtx.globalCompositeOperation = 'source-in'; maskCtx.drawImage(raw, 0, 0); maskCtx.globalCompositeOperation = 'source-over'; }
      if (merge) blooms.push({ x: (hands[0].palm.x + hands[1].palm.x) / 2, y: (hands[0].palm.y + hands[1].palm.y) / 2, size: hands[0].size * 1.2 * s.grow, angle: 0, strength: s.bloom * (hands[0].open + hands[1].open) / 2, dissolve: (hands[0].dissolve + hands[1].dissolve) / 2 });
      if (!isDemo && video?.readyState >= 2 && now - lastLight > 500) {
        lightCtx.drawImage(raw, 0, 0, 8, 8); const pixels = lightCtx.getImageData(0, 0, 8, 8).data;
        let total = 0; for (let i = 0; i < pixels.length; i += 4) total += pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
        lighting += (clamp(total / (64 * 150), .45, 1.4) - lighting) * .2; lastLight = now;
      }
      blooms.forEach(p => { p.size *= s.flowerSize * (1 + (beatRef.current || 0) * .15); });
      // Hand mask hides supporting vines, never the flowers held on the palm.
      if (s.occlusion || s.background !== 'camera') ctx.drawImage(mask, 0, 0);
      if (botanical) { try { botanical.render(ctx, blooms, s, now, lighting); } catch (error) { console.error(error); botanical.dispose(); botanical = null; setRenderError('3D rendering failed. Reload with hardware acceleration enabled.'); } }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.vy += dt * 35; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.globalAlpha = Math.min(p.life, 1); const pigment = ctx.createLinearGradient(-4, -6, 4, 6); pigment.addColorStop(0, '#fff2e4'); pigment.addColorStop(.6, p.color); pigment.addColorStop(1, '#9e5468'); ctx.fillStyle = pigment; ctx.beginPath(); ctx.moveTo(0, -6); ctx.bezierCurveTo(5, -3, 4, 4, 0, 6); ctx.bezierCurveTo(-3, 2, -5, -2, 0, -6); ctx.fill(); ctx.restore();
      }
      if (particles.length > 450) particles.splice(0, particles.length - 450);
      if (s.wildlife !== 'none') for (let i = 0; i < 8; i++) {
        const x = w * (.5 + .44 * Math.sin(now / (2900 + i * 200) + i * 6)), y = h * (.5 + .4 * Math.cos(now / (3500 + i * 150) + i));
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = s.wildlife === 'fireflies' ? '#edffa8' : s.color; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        const wing = s.wildlife === 'butterflies' ? 3 + Math.abs(Math.sin(now / 100 + i)) * 7 : 1.5;
        ctx.beginPath(); ctx.ellipse(-wing / 2, 0, wing, wing * .6, -.5, 0, Math.PI * 2); ctx.ellipse(wing / 2, 0, wing, wing * .6, .5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (s.showLandmarks) for (const { points } of hands) if (points) { ctx.strokeStyle = '#80dcff'; ctx.lineWidth = 1; for (const [a, b] of HAND_CONNECTIONS) { ctx.beginPath(); ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); ctx.stroke(); } }
      frames++; if (now - lastStats > 700) { latest.current.onStats({ fps: Math.round(frames * 1000 / (now - lastStats)), hands: hands.length, gesture: merge ? 'Shared bloom' : hands.some(hand => hand.open > .5) ? 'Open palm' : hands.length ? 'Closed hand' : 'Show your hand' }); lastStats = now; frames = 0; }
    }
    frame = requestAnimationFrame(render); return () => { cancelAnimationFrame(frame); botanical?.dispose(); };
  }, [videoRef, resultsRef, canvasRef, beatRef]);
  return <><canvas ref={canvasRef} className="effect-canvas" aria-label="Camera and textured 3D flower effect" />{renderError && <p className="stage-message" role="alert">{renderError}</p>}</>;
}
