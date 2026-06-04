import type { FigureDefinition } from './types'

// F5 teaches the full git-workflow loop that puts scope discipline into practice:
// branch → scope the ask → run Claude → diff → merge or discard. The "Claude refactored
// everything when I just wanted one thing" complaint isn't really a prompt problem — it's a
// workflow problem. A branch is a sandbox you can throw away. The composite shape's five
// strokes map to the five beats of the workflow.
export const FIGURE_5_EXTRA_SYSTEM = `You are helping a designer compose a tight, scoped directive for a Claude Code session running against a cloned copy of this prototype.

The user has given you:
- A branch name (so the work is sandboxed)
- A target file or segment they want changed
- The single change they want made

Reply with the directive itself only — no preamble, no markdown headings. Three to five sentences maximum. The directive must:

- Open by naming the target file or segment explicitly.
- Describe the single change in concrete terms.
- Forbid edits outside the named target — say so in plain words. The user's stated worry is that Claude touches other things.
- End with a one-line acceptance criterion (how they'd know the change is right).

Do NOT pretend to apply the change yourself. You're refining the request, not executing it.`

export const figure5: FigureDefinition = {
  id: 5,
  shape: 'composite',
  title: 'Make a branch, then ask',
  capability:
    'Use the git workflow to keep Claude’s changes contained — a branch, a scoped ask, a diff, a decision',
  intro:
    'The "I asked for one thing and Claude refactored everything" story isn’t a prompt problem. It’s a workflow problem. A branch is a sandbox you can throw away. Make one, scope the ask inside it, look at the diff, then merge or discard the whole branch. The composite shape’s five strokes are the five beats: branch, scope, ask, diff, decide.',
  task:
    'Walk the five beats. Write the goal. Pick the target. Refine the directive with Claude. Run it in your terminal. Make the call — merge or throw the branch away.',
  tips: [
    'A branch is a sandbox you can throw away — Claude’s changes stay contained until you decide.',
    'The loop is five beats: branch, scope, ask, diff, decide. The composite is the whole loop, not one move.',
    'On a branch you can let Claude try something bold without risking main.',
  ],
}
