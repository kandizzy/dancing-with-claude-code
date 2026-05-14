import type { FigureDefinition } from './types'

// Seed CLAUDE.md. Plain-English on purpose — the lesson of figure 1 is that this file is
// "Claude's standing instructions for the project," and the seed shouldn't itself become
// the friction. Earlier drafts leaned hard on CV vocab (detector, MediaPipe, threshold,
// false positive, YOLO/OpenCV bans) which made the file unreadable to non-CV students.
// This version describes the project in friendly terms, names ONE detector specifically,
// and keeps behavior rules grounded in things a non-CV reader can still understand.
export const SEED_CLAUDE_MD = `## About this project

This is a small webcam app that runs in your browser. It looks at your face through the camera and draws a box around it. Nothing leaves your tab — the detection runs locally.

The library doing the face-finding is MediaPipe Tasks. We are using just the face detector (not the full landmark model, not pose, not hands).

The person using this app might be a designer, a student, or anyone exploring how detection works. Treat them as curious, not as a computer vision engineer.

## How Claude should behave

- When the user asks a question about detection, look at what's actually happening on screen before generalizing. If you can't see the current state, say so.
- When suggesting a numeric change (like a confidence threshold), say what the trade-off is. A higher number means fewer false detections but also more missed faces. Always name the trade.
- Stick to MediaPipe. Don't suggest swapping in a different library (like OpenCV or YOLO) unless the user asks for that specifically.

## Notes
`

export const figure1: FigureDefinition = {
  id: 1,
  shape: 'circle',
  title: 'Write a CLAUDE.md',
  capability:
    'Grow Claude’s project context by adding notes to CLAUDE.md and watching the next reply use them',
  intro:
    'Every Claude Code session reads a file called CLAUDE.md before it answers anything. It’s your project’s standing instructions. Most users never open it — they just chat, and Claude guesses. Here, you’ll write into it as you go, and watch the next reply pick up what you wrote.',
  task:
    'Ask Claude something about this project. When the answer surfaces something worth keeping — a preference, a constraint, a rule — pin it to CLAUDE.md. Ask again. The reply will change.',
}
