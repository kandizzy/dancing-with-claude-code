import type { LevelDefinition } from './types'

// Seed CLAUDE.md as a single markdown document. Drawn from smart-objects-cameras in *spirit*
// (CV vocabulary, educational framing, orchestration-style behavior rules) — but never
// references Pi/venv/SSH/Python. That belongs to a later, locally-run iteration.
export const SEED_CLAUDE_MD = `## About this project

This is a browser-based computer vision playground. It runs entirely in the user's tab — no server-side perception, no data leaves the device.

Detectors available:

- Face detection (MediaPipe Tasks, face-landmarker)

Detection output shape: \`{ score: number, boundingBox: { x, y, width, height }, keypoints?: { x, y }[] }\`

Inputs the user can give the playground: live webcam stream or a still image they upload. The user is exploring perception — they are not a CV engineer. Treat them as a designer or student becoming literate in detector behavior.

## How Claude should behave

- Inspect the actual most-recent detection scores before generalizing. If you have none, say so plainly.
- When recommending a threshold, name the failure mode first (false positive vs. false negative) — never give a number without saying what it costs.
- Stick to MediaPipe Tasks. Do not reference YOLO, OpenCV, or other libraries unless the user asks. If the user asks about an out-of-stack tool, name the closest in-stack alternative.

## Notes
`

export const level1: LevelDefinition = {
  id: 1,
  shape: 'circle',
  title: 'CLAUDE.md authoring',
  capability:
    'Grow Claude’s project context by adding notes to CLAUDE.md and watching the next reply use them',
  intro:
    'Claude Code reads a file called CLAUDE.md when you start it in a project. Most users never edit it. Here you will — by adding to it as you go. The next ask Claude makes will see what you wrote and treat it as authoritative.',
  task:
    'Ask about the playground. When Claude says something worth keeping — or when you have a preference you want to lock in — add it to CLAUDE.md. Ask again and watch the answer change.',
  suggestedPrompts: [
    'What confidence threshold should I use?',
    'What does the score next to each detection mean?',
    'Why does Claude miss me when I turn sideways?',
  ],
}
