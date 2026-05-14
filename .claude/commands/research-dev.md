---
description: Research-first workflow. Read the codebase before proposing any change. Pass the task — e.g. /research-dev add hand tracking.
---

# Research-First Development Workflow

You are helping build a feature for the Dancing with Claude prototype — a browser-based CV playground for learning Claude Code, hosted as a Next.js 16 app.

**Task from the user:** $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user for the task. The user can answer with the task on their next message; this conversation has memory.

Otherwise, follow this structured workflow that emphasizes research and understanding before implementation.

## Phase 1: RESEARCH (Ground in Reality)

**CRITICAL: Always start here. Never skip to implementation.**

1. **Read Project Documentation**
   - `CLAUDE.md` — project context, behavior rules, what's in scope
   - `CONTRIBUTING.md` — file-where map and house rules
   - `docs/desktop-translation.md` — how each figure relates to real Claude Code usage on desktop

2. **Check Existing Patterns**
   - How are figure workspaces structured? (`src/components/learn/Figure{1..5}Workspace.tsx`)
   - How does state flow? (`src/lib/learn-store.tsx`)
   - How does Claude get called? (`src/lib/ai/{cli,call,client}.ts` — everything routes through the Agent SDK locally)
   - How do the on-disk routes look? (`src/app/api/{ai,claude-md,commands,diff}/route.ts`)

3. **Understand the Affected Figure**
   - What does the user currently see?
   - What's the gate (the user's authored act that earns the shape)?
   - What other figures or components might this change affect?

## Phase 2: PLAN

Explain to the user:
- What you propose to change
- Which files you'd touch
- Why this approach fits the existing patterns
- What you'll explicitly NOT change

Wait for the user to confirm the plan before implementing.

## Phase 3: IMPLEMENT

Make the change, narrating as you go.
- Stay within the named files. If you need to touch something outside, say so first.
- Run `npm run build` before declaring done — it catches TypeScript errors and SSR issues.
- Tell the user how to verify (which figure to open, what to do).
