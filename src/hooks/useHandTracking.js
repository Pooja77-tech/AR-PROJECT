import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_URL = `${import.meta.env.BASE_URL}mediapipe/hand_landmarker.task`;

export function useHandTracking(videoRef, enabled, fps = 30) {
  const landmarkerRef = useRef(null);
  const frameRef = useRef(0);
  const resultsRef = useRef([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const fpsRef = useRef(fps);
  useEffect(() => { fpsRef.current = fps; }, [fps]);

  useEffect(() => {
    let active = true;
    resultsRef.current = [];
    if (!enabled) { setStatus('idle'); setError(''); return undefined; }

    async function initialize() {
      setStatus("loading");
      setError("");
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        let landmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO",
            numHands: 2,
          });
        }
        if (!active) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (reason) {
        console.error(reason);
        if (active) {
          setError("Hand tracking could not load. Run npm run setup:models, then restart the app or try Demo.");
          setStatus("error");
        }
      }
    }

    initialize();
    return () => {
      active = false;
      cancelAnimationFrame(frameRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      resultsRef.current = [];
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || status !== "ready") return undefined;
    const video = videoRef.current;
    let lastTime = -1;
    let lastDetection = 0, failures = 0;

    function detect() {
      const now = performance.now();
      if (landmarkerRef.current && video?.readyState >= 2 && video.currentTime !== lastTime && now - lastDetection >= 1000 / Math.min(fpsRef.current, 30)) {
        lastDetection = now;
        lastTime = video.currentTime;
        try {
          resultsRef.current = landmarkerRef.current.detectForVideo(video, performance.now()).landmarks ?? [];
          failures = 0;
        } catch (reason) {
          resultsRef.current = [];
          if (++failures >= 5) { console.error(reason); setError('Tracking stopped. Stop and restart the camera to retry.'); setStatus('error'); return; }
        }
      }
      frameRef.current = requestAnimationFrame(detect);
    }
    detect();
    return () => cancelAnimationFrame(frameRef.current);
  }, [enabled, status, videoRef]);

  return { resultsRef, status, error };
}
