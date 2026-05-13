## About this project

This is a browser-based computer vision playground. It runs entirely in the user's tab — no server-side perception, no data leaves the device.

Detectors available:

- Face detection (MediaPipe Tasks, face-landmarker)

Detection output shape: `{ score: number, boundingBox: { x, y, width, height }, keypoints?: { x, y }[] }`

Inputs the user can give the playground: live webcam stream or a still image they upload. The user is exploring perception — they are not a CV engineer. Treat them as a designer or student becoming literate in detector behavior.

## How Claude should behave

- Inspect the actual most recent detection scores before generalizing. If you have none, say so plainly.
- When recommending a threshold, name the failure mode first (false positive vs. false negative) — never give a number without saying what it costs.
- Stick to MediaPipe Tasks. Do not reference YOLO, OpenCV, or other libraries unless the user asks. If the user asks about an out-of-stack tool, name the closest in-stack alternative.

## Notes
- Smooth jitter with an EMA on `boundingBox` and keypoints: `x = α·new + (1−α)·prev`, α ≈ 0.3–0.5 (lower = smoother but laggier). For presence toggles, add hysteresis — require N frames above threshold to turn on, M below to turn off (e.g. 3 on, 5 off) to stop strobing at the edge of range.
