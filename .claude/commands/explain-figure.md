---
description: Walk through what one of the five figures teaches and how it's built. Pass the number — e.g. /explain-figure 3.
---

The user wants to understand one of the five figures in this project.

The canonical mapping is:
- Figure 1 — Circle — Write a CLAUDE.md (reading and growing Claude's project context).
- Figure 2 — Triangle — Try a slash command (discovering and invoking prepared prompts).
- Figure 3 — Arc — Write a directive, not a chat (scoped requests with target + action).
- Figure 4 — Square — Read the diff before you accept (reviewing tool-use output).
- Figure 5 — Composite — Make a branch, then ask (the full git workflow loop).

Figure requested: $ARGUMENTS

If `$ARGUMENTS` is empty or not a number 1–5, ask the user which figure they want — e.g. "Which figure? 1, 2, 3, 4, or 5?" Then stop and wait. The user can answer with just the number on their next message; this conversation has memory, so a single-digit follow-up will pick up where you left off.

If it IS a number 1–5, do this:

1. Read `src/lib/figures/figure-N.ts` for the figure's copy and any system-prompt extras.
2. Read `src/components/learn/Figure{N}Workspace.tsx` (or `FigureChat.tsx` for Figure 1) for the workspace component.
3. Read `src/lib/figures/registry.ts` for shared helpers (system-prompt assembly, gate detection, markdown helpers).

Then explain, briefly:

- **What it teaches** — the capability, the gate (the user's authored act that earns the shape).
- **How it's built** — the state, the Claude call, the gate detection.
- **One thing to try** — a concrete extension a student could ship (a new starter note, a different gate threshold, a tone change).

Be specific — name files and line ranges. Don't invent details you didn't read. Don't pretend to make edits unless the user asks.
