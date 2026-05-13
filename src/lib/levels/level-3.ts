import type { LevelDefinition } from './types'

export const level3: LevelDefinition = {
  id: 3,
  shape: 'arc',
  title: 'Write a directive, not a chat',
  capability:
    'Compose a directive with three explicit parts (scope, target, single change) instead of an open-ended chat',
  intro:
    'A common failure mode is treating Claude like ChatGPT and chatting vaguely about a problem. A directive is sharper: it names what to touch, where, and what single change to make. The arc is earned when you submit a directive with all three parts filled.',
  task:
    'Use the form below. Pick a scope (what slice of the playground), name a target (a behavior rule or pinned note), and name one specific change. Send.',
}
