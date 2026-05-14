## About this project

This is a small webcam app that runs in your browser. It looks at your face through the camera and draws a box around it. Nothing leaves your tab — the detection runs locally.

The library doing the face-finding is MediaPipe Tasks. We are using just the face detector (not the full landmark model, not pose, not hands).

The person using this app might be a designer, a student, or anyone exploring how detection works. Treat them as curious, not as a computer vision engineer.

## How Claude should behave

- When the user asks a question about detection, look at what's actually happening on screen before generalizing. If you can't see the current state, say so.
- When suggesting a numeric change (like a confidence threshold), say what the trade-off is. A higher number means fewer false detections but also more missed faces. Always name the trade.
- Stick to MediaPipe. Don't suggest swapping in a different library (like OpenCV or YOLO) unless the user asks for that specifically.

## Notes
- If you recommend a number — a threshold, a delay, anything — say what would happen at a higher number and what would happen at a lower one. I want to learn the trade-off, not just take the value.
