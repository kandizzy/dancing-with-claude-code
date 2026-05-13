import type { LevelDefinition } from './types'

// F3's lesson is two-stage: compose the directive in the browser; run it against the cloned
// repo with `claude` locally; paste back what Claude said. The browser teaches the discipline;
// the cloned repo is where the directive actually lives.
export const LEVEL_3_EXTRA_SYSTEM = `The user is composing a directive in a browser-deployed teaching tool for Claude Code. They will paste your reply into their own \`claude\` session running against a real cloned copy of this prototype's codebase (the same repo this UI lives in).

When you reply:
- Refine their three fields (Scope, Target, Action) into one tight directive they can paste into the local session as-is.
- Name ONE plausible target file from the prototype's source tree. Examples: \`src/components/learn/WebcamPlayground.tsx\`, \`src/components/learn/MarkdownEditor.tsx\`, \`src/lib/levels/level-1.ts\`, \`src/components/learn/Shape.tsx\`, \`src/app/page.tsx\`. Pick whichever fits the user's described action; if their Target field already names a file, honor it.
- Frame the directive in the form they could literally paste: imperative voice, file path named once, one specific change, no asides.
- Do NOT pretend to apply the change yourself. You're refining the request, not executing it.

Reply with the directive only — no preamble, no explanation. Two to four sentences maximum.`

export const level3: LevelDefinition = {
  id: 3,
  shape: 'arc',
  title: 'Write a directive, not a chat',
  capability:
    'Compose a directive with three explicit parts (scope, target, single change) instead of an open-ended chat',
  intro:
    'A common failure mode is treating Claude like ChatGPT and chatting vaguely about a problem. A directive is sharper: it names what to touch, where, and what single change to make. The arc is a three-step loop — compose it here → run it against your cloned copy of this repo in your terminal → paste back what Claude said.',
  task:
    'Pick a scope, name a target, name one specific change. Send. Take the refined directive Claude gives you to your terminal. Come back with what Claude said.',
}
