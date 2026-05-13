# CLAUDE.md

Guidance for AI assistants working in this prototype.

## What this is

**Dancing with Claude.** A five-figure choreography for learning to direct Claude Code, hosted as a Next.js 16 SPA. The user works inside a browser computer-vision playground; each figure surfaces one Claude-Code capability frequent users frequently miss. The score the user writes as they go is their own `CLAUDE.md`, persisted across all five figures.

The progression axis is **Claude-usage sophistication**, not perception. The CV substrate is the playground; what the user is mastering is their repertoire of how to deploy Claude as a complement.

The visual language is adapted from **Oskar Schlemmer's Bauhaus dances** (1922–1929): dancers built of geometric primitives, choreography laid out as a score of cells with handwritten *Pause* annotations between figures. References live at `../design-inspiration/`.

## Figures (the progression spine)

| Figure | Shape | Capability earned |
|---|---|---|
| 1 | Circle | Reading & directing Claude via `CLAUDE.md` |
| 2 | Triangle | Discovering and invoking slash commands |
| 3 | Arc | Writing a directive (scope, filename, single change) instead of chatting |
| 4 | Square | Reading tool-use *as it happens*; reviewing before accept |
| 5 | Composite | Scoping a change to one segment, not the whole codebase |

Each figure's *gate* must test a Claude-usage capability — never a domain outcome. If a figure ends with "you tuned the threshold correctly," it's the wrong gate.

## Architecture inherited from the scaffold (don't refactor unprompted)

1. **Design tokens** — `src/app/globals.css`, Tailwind v4 `@theme`.
2. **UI primitives** — `src/components/ui/` (`Button`, `Avatar`).
3. **Chat components** — `src/components/chat/`.
4. **Chat state** — `src/lib/chat-store.tsx` (React context, `localStorage` persisted).
5. **API** — `src/app/api/chat/route.ts` (edge runtime, streams from the SDK). `src/lib/api.ts` wraps `fetch` with a canned-response fallback.
6. **Routes** — App Router under `src/app/`.

Note: if Level 4 needs visible tool-use, the edge runtime may need to move to node and the route may need expansion. Decide when we get there.

## What this prototype adds

- `src/lib/learn-store.tsx` — sibling provider for figure/shape state and the live CLAUDE.md the user authors. Persisted to localStorage. Do NOT fold into ChatProvider — they have different lifecycles.
- Routes `/learn` (figure index) and `/learn/[level]` (per-figure workspace; the URL slug keeps the word "level" for now to avoid a route rename).
- Per-figure workspaces under `src/components/learn/Level{1..5}Workspace.tsx`, dispatched from the route. Each owns its interaction (chat with pinning, slash palette, directive form, tool proposal card, segment picker).
- `ClaudeMdAuthor` panel lives on every figure's page — the score the user is writing.
- `src/app/api/level-chat/route.ts` assembles the system prompt at call time from the current `ClaudeMdState`; figures that need an extra instruction (e.g. L4's JSON tool-use convention) pass `extraSystem`.
- Webcam + MediaPipe face detection, browser-only. Image-upload fallback on the same code path. _(planned — not yet built; the "playground" is currently metaphorical)._
- `docs/desktop-translation.md` — running notes on how each web mechanic maps to its Claude Code desktop equivalent in a target project.

## Naming note

Internal identifiers still use the word `level` (`LevelId`, `LEVELS`, `Level1Workspace`, `/learn/[level]`, `level-1.ts`, …). User-facing surfaces use **figure**. Don't rename the identifiers unprompted — it's a sweeping change for no functional gain.

## Component conventions

All components follow this shape:

```tsx
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

type ThingProps = ComponentProps<'div'> & {
  customProp?: string
}

export function Thing({ className, customProp, ...props }: ThingProps) {
  return <div className={cn('base-classes', className)} {...props} />
}
```

- `className` merged with `cn()` (clsx + tailwind-merge).
- `'use client'` only where hooks/state/browser APIs are used.
- Icons from `lucide-react`, sized with Tailwind (`<Plus className="size-4" />`).

## Server vs client

- Route handlers (`app/api/**/route.ts`) run server-side — keep API keys and SDK calls here.
- Pages default to server components; add `'use client'` when needed.
- Webcam + MediaPipe code is client-only by definition.

## Commands

```bash
npm run dev     # dev server on :3000
npm run build   # production build + typecheck (run before considering a change done)
npm run lint    # eslint
```

## Hard constraints

- Deployed prototype that anyone can open cold — Vercel.
- Must work without the user's webcam (camera-denied fallback).
- Target user: someone who has used Claude Code a little; not first-time onboarding.

## Anti-patterns

- Real-time Claude narration of every detector frame. We tried this framing in planning and dropped it; not what the design calls for.
- Parity-principle / "extended mind" claims in copy or rationale. Anchor on the **complementary principle** + constructivism instead.
- Figure gates that test domain understanding instead of Claude-usage capability.
- Pi-classroom content (hostnames, venv paths, depthai versions, SSH) in user-facing copy. That's a later, locally-run iteration's concern; mixing it into the browser playground muddles the user's mental model.
