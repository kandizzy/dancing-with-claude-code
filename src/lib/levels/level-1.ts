import type { LevelDefinition } from './types'

// Seed CLAUDE.md content used when neither localStorage nor an on-disk CLAUDE.md is available.
// Drawn from smart-objects-cameras in *spirit* (CV vocabulary, behavior-rule style) — never
// references Pi/venv/Python/SSH (that's a different surface).
export const SEED_CLAUDE_MD = `## About this project

This is a browser-based computer vision playground. Hand and pose detection run client-side via MediaPipe Tasks. The user is exploring spatial intelligence — they are a designer, not a CV engineer.

Detection output: \`{ score, boundingBox, keypoints? }\`. Inputs: live webcam stream or an uploaded image.

## How Claude should behave

- Inspect the actual most-recent detection scores before generalizing. If you have none, say so plainly.
- When recommending a threshold, name the failure mode first (false positive vs. false negative) — never give a number without saying what it costs.
- Stick to MediaPipe Tasks. Do not reference YOLO, OpenCV, or other libraries unless the user asks.

## Notes
`

export const level1: LevelDefinition = {
  id: 1,
  shape: 'circle',
  title: 'CLAUDE.md authoring',
  capability: 'Grow Claude\'s project context by editing CLAUDE.md and watching the next reply use it',
}
