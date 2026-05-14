import type { FigureDefinition } from './types'

// F4 pivots to post-execution review: Claude proposes a real edit to the user's CLAUDE.md.
// The user reads the diff and chooses whether to apply it. Either choice earns the shape —
// the muscle is *reading the diff*, not the verdict.
export const FIGURE_4_EXTRA_SYSTEM = `You are proposing an edit to the user's CLAUDE.md file. The current contents of CLAUDE.md are provided between the markers. Apply the user's requested change and return ONLY the complete new file content in a single fenced markdown block:

\`\`\`markdown
<the complete new CLAUDE.md after your change>
\`\`\`

Rules:
- Return the WHOLE file, not just the changed lines. We compute the diff client-side.
- Preserve the file's existing structure and ordering exactly. Make the smallest change that fulfills the user's request.
- Touch ONLY the lines you are intentionally changing. Do NOT rewrite, reformat, retrim, or re-indent lines whose meaning is unchanged — a diff that removes a line and re-adds an identical (or near-identical) line is a bug; the user will see it as noise.
- Do not add commentary before or after the fenced block.
- Do not invent values the user did not mention. If the user's request is vague, make a minimal, defensible change rather than a maximal one.
- Use the exact same line endings, whitespace, and indentation as the original on every line you are not actively changing.`

export const figure4: FigureDefinition = {
  id: 4,
  shape: 'square',
  title: 'Read the diff before you accept',
  capability:
    'Read the diff of what Claude is about to change, line by line, before it lands',
  intro:
    "In real Claude Code, every edit shows up as a diff before it commits. Three of five students we surveyed said they just hit y. The muscle we’re building here is the pause — read the change, then decide. We’ll exercise it on the file you’ve been authoring: your CLAUDE.md.",
  task:
    "Describe a change you’d like Claude to make to your CLAUDE.md. You’ll see the proposed new file as a line-by-line diff. Accept it or discard it — either choice earns the square. The shape is for looking, not for agreeing.",
}
