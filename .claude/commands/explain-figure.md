---
description: Walk the user through the code behind a figure (1–5) and how they could extend it.
---

The user is studying one of the five figures in this prototype and wants to understand its code.

If they didn't name a figure number, ask for one (1–5). Otherwise:

1. Read `src/lib/levels/level-N.ts` for the figure's intro/task copy and any system-prompt extras.
2. Read `src/components/learn/Level{N}Workspace.tsx` (or `LevelChat.tsx` for Figure 1) for the workspace component.
3. Read `src/lib/levels/registry.ts` for shared helpers the workspace uses (system-prompt assembly, gate detection, markdown helpers).

Then explain, briefly:

- What the figure teaches (the capability, the gate, the round-trip if it has one).
- How the workspace component implements that — the state, the Claude API call, the gate detection or hand-off.
- One concrete extension a student could try (e.g., add a third suggested-prompt chip, change the gate threshold, swap the system-prompt's tone).

Be specific — name files and line ranges. Don't pretend to make edits unless the user asks.
