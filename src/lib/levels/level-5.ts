import type { LevelDefinition } from './types'

export const level5: LevelDefinition = {
  id: 5,
  shape: 'composite',
  title: 'Scope to one segment',
  capability:
    'Constrain a change to exactly one segment of your project — leaving everything else alone',
  intro:
    'A wide-open ask invites Claude to touch everything. A scoped ask names one thing. Here you’ll pick one segment of your project — one behavior rule, or one pinned note — and ask for a change that operates on it and nothing else.',
  task:
    'Pick a target segment from your CLAUDE.md, name the change you want, send. The composite shape is earned when you submit a request that names exactly one target.',
}
