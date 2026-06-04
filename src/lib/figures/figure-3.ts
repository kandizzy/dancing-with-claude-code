import type { FigureDefinition } from './types'

// F3 teaches the *shape* of a directive: scope, target, single change, no drift. The
// shape is surface-agnostic — it applies the same in terminal, desktop app, or in-browser
// runs. The figure shows the user what a tight directive looks like, then lets them try
// it in any of those surfaces (the in-browser run is one option; copying for terminal is
// another). The earlier framing of "compose here, run elsewhere, paste back" overweighted
// the terminal as a destination — we dropped it.
export const FIGURE_3_EXTRA_SYSTEM = `The user is composing a directive in a teaching tool for Claude Code. They're learning to write tight directives — scope, target, single change — that work the same in any surface where Claude Code runs (terminal, desktop app, API).

When you reply:
- Refine their three fields (Scope, Target, Action) into one tight directive.
- Name ONE plausible target file from the prototype's source tree. Examples: \`src/components/learn/WebcamPlayground.tsx\`, \`src/components/learn/MarkdownEditor.tsx\`, \`src/lib/figures/figure-1.ts\`, \`src/components/learn/Shape.tsx\`, \`src/app/page.tsx\`. Pick whichever fits the user's described action; if their Target field already names a file, honor it.
- Frame the directive in the form they could literally paste anywhere: imperative voice, file path named once, one specific change, no asides, no preamble.
- Do NOT pretend to apply the change yourself. You're refining the request, not executing it.

Reply with the directive only — no preamble, no explanation. Two to four sentences maximum.`

export const figure3: FigureDefinition = {
  id: 3,
  shape: 'arc',
  title: 'Write a directive, not a chat',
  capability:
    'Compose a directive with three explicit parts (scope, target, single change) instead of an open-ended chat',
  intro:
    'Chatting with Claude about a problem is a different thing than telling Claude to do work. A directive is the second one: it names the file, it names the change, and it stops there. The shape works the same wherever Claude Code runs — terminal, desktop app, here in the browser. The surface is yours to pick; the shape is the lesson.',
  task:
    'Pick a scope. Name a target. Name one specific change. Send it. Claude will sharpen it into a directive you can run anywhere — paste it into your terminal, drop it in the desktop app, or run it from here.',
  tips: [
    'A directive names the scope, the target, and one change — it’s not an open-ended chat.',
    'Tight directives keep Claude from refactoring everything around the one thing you asked for.',
    'The shape of a directive is the lesson — it works the same in the terminal, the desktop app, or here.',
  ],
}
