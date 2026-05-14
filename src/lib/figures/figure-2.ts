import type { FigureDefinition } from './types'

export const figure2: FigureDefinition = {
  id: 2,
  shape: 'triangle',
  title: 'Try a slash command',
  capability:
    'Invoke a prepared slash command instead of typing out a long prompt from scratch',
  intro:
    'A slash command is a long prompt with a short name. Project owners pre-write the careful version once; you invoke it with two keystrokes. Most users never find out their project has any. This one has three. Type / to see them.',
  task:
    'Type / in the input, pick one, send it. Earn the triangle the second you do.',
}
