import type { LevelDefinition } from './types'

// The "tool" Claude proposes in this level. v1 simulates tool-use via a JSON convention rather
// than the real Anthropic tool_use API — same pedagogy, much less infra.
export const LEVEL_4_TOOL = {
  name: 'set_threshold',
  description: 'Set the confidence threshold the playground uses for face detection.',
}

// The extra system instruction we append when sending L4 requests.
export const LEVEL_4_EXTRA_SYSTEM = `For this conversation, respond ONLY with a single JSON object — no prose around it — shaped as:
{
  "tool": "set_threshold",
  "params": { "value": <number between 0 and 1> },
  "reason": "<one or two short sentences explaining the choice, citing pinned notes or behavior rules when relevant>"
}
If the user's question doesn't call for a threshold change, still return a JSON object with reason explaining that no change is recommended and value equal to the current default (0.6).`

export const level4: LevelDefinition = {
  id: 4,
  shape: 'square',
  title: 'Review before you accept',
  capability:
    'Read what Claude is about to do, in structured form, and consciously accept or reject it',
  intro:
    'In Claude Code, every file edit and shell command comes through as a tool call you can review before it runs. The muscle here is the same: pause, read the proposal, then decide. 3/5 surveyed students said they just hit y. The square is earned when you make a conscious choice.',
  task:
    'Ask Claude something that would change a setting (e.g., "raise the threshold for crowded scenes"). Claude will reply with a structured proposal. Read the params and reason. Then Accept or Reject — either one earns the shape.',
}
