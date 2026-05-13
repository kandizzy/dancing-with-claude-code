import type { LevelDefinition } from './types'

export type SlashCommand = {
  name: string
  description: string
  prompt: string
}

// The playground "ships with" these commands. Survey: 0/5 ever used the slash commands
// that came in the smart-objects-cameras repo. This level surfaces them at the moment of need.
export const LEVEL_2_COMMANDS: SlashCommand[] = [
  {
    name: 'explain-detection',
    description: 'Walk through what a single detection means in plain language.',
    prompt:
      'Walk me through a single face detection from this playground in plain language: what fields it has, what the score represents, and how I should read the keypoints. Be concrete.',
  },
  {
    name: 'why-low-score',
    description: 'Diagnose why a detection score might be lower than expected.',
    prompt:
      'I just got a face detection with a score I think is too low. Walk me through the most likely causes (lighting, angle, distance, occlusion, model bias) and which I should rule out first. Use the behavior rules in my CLAUDE.md.',
  },
  {
    name: 'suggest-threshold',
    description: 'Recommend a confidence threshold for my use case, with tradeoffs.',
    prompt:
      'Recommend a confidence threshold for my use case. Name the failure mode first (false positive vs false negative) and then give me a concrete number. If I have a pinned preference in CLAUDE.md, use it.',
  },
]

export const level2: LevelDefinition = {
  id: 2,
  shape: 'triangle',
  title: 'Slash command discovery',
  capability:
    'Invoke a prepared slash command instead of typing out a long prompt from scratch',
  intro:
    'Claude Code ships with slash commands — short, named invocations that expand into a full prompt. Most users never discover the ones their project already has. This playground ships with three. Type / in the input below to find them.',
  task:
    'Type / in the input, pick a command, and send it. Earn the triangle the moment you invoke one.',
}
