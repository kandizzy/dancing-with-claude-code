---
description: Student-friendly workflow for extending the Dancing with Claude playground. Plan first, build small.
---

# Help Me Code (Student Version)

I'm a designer or student working on this CV playground. I want to build a new feature or fix something.

Please help me by:

1. **First, understand what already exists**
   - Look at similar components in `src/components/learn/`
   - Check how `WebcamPlayground.tsx` wires MediaPipe Tasks
   - Read the per-figure workspaces (`Level{1..5}Workspace.tsx`) — they share a structure
   - Read `src/lib/learn-store.tsx` for the state model and the on-disk CLAUDE.md sync

2. **Then, explain your plan to me**
   - What approach will you take?
   - Why is this a good fit for this codebase?
   - What existing code are you building on?
   - Which files will you touch — and which will you NOT?

3. **Build the feature**
   - Follow the patterns in existing components: design tokens, store usage, single-turn `ask()` calls
   - Explain what you're doing as you go
   - Confirm it works in both CLI mode (local) and API mode (deployed)

4. **Show me how to use it**
   - Give me clear instructions
   - Tell me how to test it (which figure to open, what to do)
   - Run `npm run build` before declaring done
