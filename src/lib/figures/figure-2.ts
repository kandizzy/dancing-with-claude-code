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
  tips: [
    'A slash command is a long, careful prompt saved under a short name — written once, invoked with two keystrokes.',
    'Slash commands are the manual face of skills: you type /name. Claude can also reach for a skill on its own when it fits the task.',
    'Project owners pre-write commands so the whole team runs the same careful prompt.',
    'Gotcha: most projects already have commands you’ve never seen — type / to discover them.',
  ],
}
