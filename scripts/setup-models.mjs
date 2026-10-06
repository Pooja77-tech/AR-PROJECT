import { cp, mkdir, access, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('../public/mediapipe/', import.meta.url);
await mkdir(directory, { recursive: true });
await cp(fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url)), fileURLToPath(new URL('wasm/', directory)), { recursive: true });
const target = new URL('hand_landmarker.task', directory);
try { await access(target); console.log('MediaPipe runtime and model are ready locally.'); }
catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length < 1_000_000) throw new Error('Model download was unexpectedly small.');
  const temporary = new URL('hand_landmarker.task.download', directory);
  await writeFile(temporary, data); await rename(temporary, target);
  console.log('Downloaded local hand model. Camera tracking no longer needs a CDN.');
}
