# CLAUDE.md

Guidance for AI assistants working in this prototype.

## What this is

A five-level in-app learning experience that teaches Claude Code usage patterns through a spatial-intelligence substrate (browser-based face detection + Claude API). Built on top of a Next.js 16 / Tailwind v4 / `@anthropic-ai/sdk` chat scaffold.

The progression axis is **Claude-usage sophistication**, not perception. The substrate (a webcam-based detector) is the playground; what the user is mastering is their repertoire of how to deploy Claude as a complement.

## Levels (the progression spine)

| # | Shape | Capability earned |
|---|---|---|
| 1 | Circle | Reading & directing Claude via `CLAUDE.md` |
| 2 | Triangle | Discovering and invoking slash commands |
| 3 | Arc | Writing a directive (scope, filename, single change) instead of chatting |
| 4 | Square | Reading tool-use *as it happens*; reviewing before accept |
| 5 | Composite | Scoping a change to one segment, not the whole codebase |

Each level's *gate* must test a Claude-usage capability — never a domain outcome. If a level ends with "you tuned the threshold correctly," it's the wrong gate.

## Architecture inherited from the scaffold (don't refactor unprompted)

1. **Design tokens** — `src/app/globals.css`, Tailwind v4 `@theme`.
2. **UI primitives** — `src/components/ui/` (`Button`, `Avatar`).
3. **Chat components** — `src/components/chat/`.
4. **Chat state** — `src/lib/chat-store.tsx` (React context, `localStorage` persisted).
5. **API** — `src/app/api/chat/route.ts` (edge runtime, streams from the SDK). `src/lib/api.ts` wraps `fetch` with a canned-response fallback.
6. **Routes** — App Router under `src/app/`.

Note: if Level 4 needs visible tool-use, the edge runtime may need to move to node and the route may need expansion. Decide when we get there.

## What this prototype adds

- `src/lib/learn-store.tsx` — sibling provider for level/shape state, localStorage-persisted. Do NOT fold into ChatProvider — they have different lifecycles.
- New routes `/learn` and `/learn/[level]` for the level UI.
- Webcam + MediaPipe face detection, browser-only. Image-upload fallback on the same code path. _(planned — not yet built)_
- Per-level system prompts; the Level 1 prompt embeds a real classroom `CLAUDE.md` excerpt as a constant.
- `docs/desktop-translation.md` — running notes on how each web mechanic maps to its Claude Code desktop equivalent in a target project.

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
- Level gates that test domain understanding instead of Claude-usage capability.
