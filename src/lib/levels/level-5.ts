import type { LevelDefinition } from './types'

// F5's lesson is the same two-stage round-trip as F3, with a different constraint: the
// directive must forbid edits outside the named target. This is the student's complaint —
// "Claude changes things I was happy with" — addressed by composing the request so that
// scope creep is impossible.
export const LEVEL_5_EXTRA_SYSTEM = `The user is composing a single-segment directive in a browser-deployed teaching tool for Claude Code. They will paste your reply into their own \`claude\` session running against a real cloned copy of this prototype's codebase.

When you reply:
- Refine the user's "change" into one tight directive that targets exactly the segment they picked, and nothing else.
- Name ONE plausible target file from the prototype's source tree that contains that segment. Examples: \`src/components/learn/WebcamPlayground.tsx\`, \`src/components/learn/MarkdownEditor.tsx\`, \`src/lib/levels/level-1.ts\`, \`src/components/learn/Shape.tsx\`, \`src/app/page.tsx\`.
- Insist explicitly that the directive forbids edits outside the named target. The user's stated complaint is that Claude touches other things; the directive must close that door.
- Do NOT pretend to apply the change yourself. You're refining the request, not executing it.

Reply with the directive only — no preamble. Three to five sentences maximum.`

export const level5: LevelDefinition = {
  id: 5,
  shape: 'composite',
  title: 'Scope to one segment',
  capability:
    'Constrain a change to exactly one segment of your project — leaving everything else alone',
  intro:
    'A wide-open ask invites Claude to touch everything. A scoped ask names one thing and forbids the rest. The composite is the same round-trip as the arc, but this time the directive has to close the door on anything outside the named target: compose here → run against your cloned repo with `claude` → paste back the receipts.',
  task:
    'Pick a target segment from your CLAUDE.md, name the change you want. Send. Take Claude\'s refined directive to your terminal. Come back with what Claude said.',
}
