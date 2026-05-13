import type { LevelDefinition } from './types'

// A focused excerpt of the Smart Objects classroom CLAUDE.md.
// Long enough to carry real, fingerprintable detail; short enough not to bury the user.
// Source: /Users/ck/Documents/sva/smart_objects_2026/smart-objects-cameras/CLAUDE.md
export const SMART_OBJECTS_CLAUDE_MD = `# CLAUDE.md (Smart Objects — Cameras)

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Educational template for Discord bots that communicate with Luxonis OAK-D cameras
(DepthAI 3.x) on Raspberry Pi 5. Students build smart object systems with computer
vision and interactive communication.

**Target Hardware:** Three Raspberry Pi 5s (16GB each) named \`orbit\`, \`gravity\`,
\`horizon\` — each with an OAK-D camera. SSH via \`ssh orbit\`, \`ssh gravity\`, \`ssh horizon\`.

**Core concept:** Cameras as conversational agents — reconfigure and query them in
real-time through Discord, not just passive sensors configured once via SSH.

## Development Environment

\`\`\`bash
# Activate shared venv (REQUIRED before running any script)
source /opt/oak-shared/venv/bin/activate
# Or use alias: activate-oak
\`\`\`

**Critical versions:** depthai 3.3.0, depthai-nodes 0.3.7,
opencv-contrib-python 4.10.0.84, numpy 1.26.4 (numpy <2.0 required).

**Secrets:** Each user has \`~/oak-projects/.env\` with \`DISCORD_WEBHOOK_URL\` and
\`DISCORD_BOT_TOKEN\`. Never commit \`.env\` files.

## Running Detectors

Each Pi has ONE camera — only ONE detector script should run at a time. Run with
\`--discord\` so others see when the camera is free.

- \`person_detector.py\` — YOLO v6 person detection (COCO class 0)
- \`fatigue_detector.py\` — YuNet + MediaPipe landmarks, EAR + head pose
- \`gaze_detector.py\` — YuNet + head pose + gaze estimation ADAS
- \`whiteboard_reader.py\` — OCR text region detection
- \`whiteboard_reader_full.py\` — OCR detection + recognition

Stop any detector with \`Ctrl+C\`. A systemd service can auto-start the person
detector on boot (\`sudo systemctl status person-detector\`).
`

export const level1: LevelDefinition = {
  id: 1,
  shape: 'circle',
  title: 'CLAUDE.md awareness',
  capability: 'Direct Claude using a CLAUDE.md the project has already attached for you',
  intro:
    'Claude Code automatically reads a file called CLAUDE.md when you start it from a project folder. Most users never look at it. This level shows you what one looks like — and proves to you, by output, that Claude is using it.',
  task: 'Ask Claude something that only makes sense because of what is in this CLAUDE.md. (Hints below if you need them.)',
  systemPrompt: `You are Claude, helping a student in the Smart Objects classroom. You have been started in a project whose CLAUDE.md is attached. Treat the attached CLAUDE.md as authoritative project context.

When the student asks you a question, draw on this CLAUDE.md whenever it contains the relevant detail — and quote the specific term or path when you do. Be concise (1–3 short paragraphs).

----- ATTACHED CLAUDE.md -----
${SMART_OBJECTS_CLAUDE_MD}
----- END ATTACHED CLAUDE.md -----`,
  // Fingerprints exist only in the attached file. If Claude says any of these,
  // it could only have come from reading the CLAUDE.md.
  gateFingerprints: [
    '/opt/oak-shared/venv',
    'activate-oak',
    'orbit',
    'gravity',
    'horizon',
    'depthai 3.3.0',
    'depthai-nodes 0.3.7',
    'opencv-contrib-python 4.10.0.84',
    'numpy 1.26.4',
    '~/oak-projects/.env',
    'DISCORD_WEBHOOK_URL',
    'DISCORD_BOT_TOKEN',
    'person_detector.py',
    'fatigue_detector.py',
    'gaze_detector.py',
    'whiteboard_reader.py',
    'whiteboard_reader_full.py',
    'YuNet',
    'EAR',
    'YOLO v6',
    '--discord',
    'person-detector', // systemd service name
  ],
  nudgeOnMiss:
    "Claude answered, but didn't draw on anything specific to this project. Try asking about something that would only be true here — a hostname, a path, a pinned version, a script name.",
  successCopy:
    "Look at the highlighted token in Claude's reply — that detail only exists in the attached CLAUDE.md. You just directed Claude through a project file you didn't have to paste. That's how Claude Code uses CLAUDE.md every time it starts in a folder.",
}
