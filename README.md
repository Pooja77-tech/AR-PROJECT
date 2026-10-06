# Bloom AR

A React + Vite camera playground powered by MediaPipe Hand Landmarker and Three.js, with textured 3D botanical flowers, gestures, local captures and a camera-free demo.

## Botanical rendering update

All flower styles now use curved 3D petal surfaces and physical materials instead of the earlier glowing Canvas flower shapes. The default is a pink-and-white lily bouquet with one open flower, one half-open flower and a bud. Lilies have six petals and visible stamens; rose, lotus, daisy, sakura and the botanical hybrid have their own petal layouts. Petal and leaf textures include procedural veins, pigment variation and fine relief. Lighting uses a warm key, cool fill, self-shadowing, and smoothed camera-brightness exposure matching.

Hold an index/thumb pinch to dissolve the bouquet into a dense cloud sampled from its petal surfaces. Release to reform it. The cloud is in the bouquet's local coordinates and follows the hand while dispersing. Demo cycles through this transition automatically.

Select **Stargazer lilies** or **Ivory lilies** for the reference-inspired starting point. Turn off **Multi-stage bouquet** for a single flower. **Petal light** adjusts exposure without neon emission. All existing flower choices use the new renderer, including previously saved custom presets. The earlier appearance settings remain saved under their old storage key; the new botanical defaults use a separate key.

These are procedurally modeled botanical flowers, not scanned/photographic assets. No reference screenshots or licensed high-resolution lily models were supplied. This upgrade does not claim an exact photorealistic reference match. It uses perspective projection and estimated palm tilt, not calibrated camera intrinsics or scene reconstruction. Camera exposure matching is a brightness heuristic; it does not estimate room light direction or cast real-world shadows onto the hand. Thin-petal appearance comes from surface shaping and soft material highlights, not volumetric subsurface scattering. WebGL 2 is required; unsupported rendering shows an error instead of reverting to cartoon flowers.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm.cmd install
npm.cmd run dev
```

Open the local URL, choose **Start camera**, and allow camera access, or choose **Try demo** without giving camera permission. Camera access requires `localhost` or HTTPS. On macOS/Linux, use `npm` instead of `npm.cmd`.

The first start/build prepares local model assets automatically. Setup copies the installed MediaPipe WASM runtime and downloads Google's 7.8 MB hand model to `public/mediapipe`. Subsequent runs reuse it. Run `npm.cmd run setup:models` explicitly to prepare these assets. No CDN or external fonts are needed while using the app after setup. This is offline operation through a running local server, not an installable PWA.

## Features

- Palm flower or five fingertip flowers, with smoothed positions and distance-based sizing.
- Lily, rose, lotus, daisy, sakura and botanical hybrid styles; adjustable petal density (where appropriate), color, bloom, growth and petal light.
- Six built-in presets, ten custom preset slots, and automatically remembered controls.
- Open your palm to bloom; close your fist to shrink flowers.
- Hold thumb/index pinch to dissolve; release to reform. Touch thumb/middle to cycle colors.
- Bring two palms together to merge their flowers; separate to scatter petals.
- Wrist rotation, animated vines/leaves, falling petals, motion trails, fireflies and butterflies.
- Camera, soft-focus and night-garden backgrounds; approximate hand masking; optional tracking mesh.
- Front/rear camera switching, mirror toggle, camera stop, fullscreen, tutorial, and 15/30/60 FPS rendering targets. Inference is capped at 30 FPS.
- PNG photos and video recording with 0/3/5-second countdown, cancel, timer, pause/resume, preview, download and browser sharing when supported.
- Optional microphone capture and music-reactive bloom. The app requests microphone permission only when you enable it, and does not play microphone audio back through speakers.
- Captures persist in IndexedDB, with individual deletion. Download important captures: browser storage may be cleared or reach quota.
- Controls can hide during recording. UI overlays and buttons are never baked into captures. Capture resolution remains stable during a recording.

## Build and checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

Deploy the entire `dist` directory, including `mediapipe`. All model processing stays in the browser.

## Browser and visual limitations

- The hand mask uses palm polygons and finger capsules calculated from landmarks. It hides vines behind the approximate hand silhouette; it is not pixel-accurate segmentation or true 3D depth. Soft focus keeps the masked hand sharp while blurring the rest of the camera view, including the body.
- The MP4 option records directly when `MediaRecorder.isTypeSupported` accepts it. Unsupported MP4 shows a clear error; choose WebM or Best supported. There is no WebM-to-MP4 transcoder bundled.
- Music response follows microphone frequency energy rather than detecting musical tempo. External music must be audible to the microphone.
- Hand inference runs on the main thread, so lower the FPS target on slower devices. GPU initialization falls back to CPU. The FPS control is a target, not a guaranteed rate.
- Gesture thresholds are heuristics, not a trained gesture model. Keep your complete hand visible and use even lighting. Crossing/overlapping hands can briefly swap tracking identity.
- Gallery storage and file sharing depend on browser support and available storage. Share requires your explicit click and browser share dialog.
- Real camera, microphone, video playback and visual browser QA must be checked on the target device. The development environment did not expose a controllable browser.

## Manual acceptance checks

1. Start Demo: verify all six flower styles, presets, sliders, visitors and backgrounds; resize between portrait and desktop. Watch an entire dissolve/reform cycle; check that every style retains curved petals and natural surfaces.
2. Start camera: verify fingertips stay aligned at the left/right edges in portrait and desktop. Flip mirroring, switch cameras, stop and restart.
3. Open/close a palm, pinch repeatedly with a release between pinches, touch thumb/middle, and bring two palms together/apart.
4. Take a photo; start/cancel a countdown; record, pause, resume and stop. Preview/download, reload to verify persistence, and delete a capture.
5. Enable microphone and music response, record audio, then disable it. Confirm camera/microphone indicators stop when disabled or the page is closed.
6. Test permission denial, camera disconnect, missing model assets, unsupported MP4 and storage limits. Ensure errors are visible and Demo remains accessible.

API references: [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [MediaRecorder format detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static).
