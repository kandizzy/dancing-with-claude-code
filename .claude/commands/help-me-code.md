---
description: Student-friendly workflow for extending the playground. Pass the feature — e.g. /help-me-code add a hand-tracking detector.
---

# Help Me Code (Student Version)

I'm a designer or student working on this CV playground. I want to build a new feature or fix something.

**What I want to build:** $ARGUMENTS

If `$ARGUMENTS` is empty, ask me what I want to build. I can answer with the feature in one message; this conversation has memory.

Otherwise, please help me by:

1. **First, understand what already exists**
   - Look at similar components in `src/components/learn/`.
   - Check how `WebcamPlayground.tsx` wires MediaPipe Tasks.
   - Read the per-figure workspaces (`Figure{1..5}Workspace.tsx`) — they share a structure.
   - Read `src/lib/learn-store.tsx` for the state model and the on-disk CLAUDE.md sync.
   - Read `src/lib/ai/client.ts` and `src/lib/ai/cli.ts` so you understand how the prototype talks to Claude (it routes everything through the Agent SDK locally).

2. **Then, explain your plan to me**
   - What approach will you take?
   - Why is this a good fit for this codebase?
   - What existing code are you building on?
   - Which files will you touch — and which will you NOT?

3. **Build the feature**
   - Follow the patterns in existing components: design tokens, store usage, `ask()` for talking to Claude.
   - For chat-style surfaces, thread the session ID like `FigureChat.tsx` and `Figure2Workspace.tsx` do; for one-shot prompts (refining a directive, proposing a diff), no session ID is needed.
   - Explain what you're doing as you go.

4. **Show me how to use it**
   - Give me clear instructions.
   - Tell me how to test it (which figure to open, what to do).
   - Run `npm run build` before declaring done.
