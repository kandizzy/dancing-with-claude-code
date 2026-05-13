import type { Chat, Config } from './types'

export const DEFAULT_CONFIG: Config = {
  userName: 'Explorer',
  thinkingDelay: 900,
  streamSpeed: 8,
}

export const CANNED_RESPONSE =
  "This is a scaffolded response. The real Claude API isn't wired up yet — this text is just streaming in to demonstrate the thinking spark and the message flow.\n\nYou can replace this with a real API call, or edit the seeded chats in the source to prototype different conversation shapes."

export const SEED_CHATS: Chat[] = [
  {
    id: 'c1',
    title: 'Naming my sourdough starter',
    messages: [
      {
        role: 'user',
        text: "I need a name for my sourdough starter. It's very bubbly and slightly judgmental.",
      },
      {
        role: 'assistant',
        text: "A judgmental starter deserves a name with gravitas. Some options:\n\n**The Classics**\nBread Pitt. Clint Yeastwood. Dough Malone.\n\n**The Aristocrats**\nLord Crumbsworth. The Dowager Loafess. Sir Rises-a-Lot.\n\n**The Unhinged**\nGluten Tag. The Thing in the Jar. Kevin.\n\nGiven the bubbly-yet-judgmental energy, I'd lean toward **The Dowager Loafess**. She's seen things. She has opinions about your feeding schedule. She will outlive you.",
      },
    ],
  },
  {
    id: 'c2',
    title: 'Convince my cat to respect me',
    messages: [
      {
        role: 'user',
        text: 'How do I convince my cat that I am, in fact, the one in charge here?',
      },
      {
        role: 'assistant',
        text: 'I admire the ambition, but I should be honest with you: you are not going to win this one.\n\n**What you can try**\nControl the food. Be the sole dispenser of treats. Establish a routine so ironclad that the cat associates your presence with reliable comfort rather than chaos.\n\n**What will actually happen**\nThe cat will accept the food, interpret the routine as the bare minimum expected of a servant, and continue to knock things off tables while maintaining direct eye contact.\n\n**The healthy reframe**\nYou are not in charge. You are a beloved and well-compensated employee. The benefits are excellent (warmth, purring, the occasional dead moth as a bonus). Lean into it.',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Time travel etiquette',
    messages: [
      {
        role: 'user',
        text: "If I invented a time machine, what's the first thing I should NOT do?",
      },
      {
        role: 'assistant',
        text: "Excellent instinct to ask about the don'ts first. In rough order of catastrophe:\n\n**Do not meet yourself.** Best case: deeply awkward. Worst case: the universe folds itself into a paradox and files a complaint.\n\n**Do not bring back a snack.** You will introduce a 14th-century bacterium to a population with no immunity and become history's most confusing villain.\n\n**Do not try to fix anything.** Every time traveler thinks they'll just nudge one small thing. Three nudges later, the Library of Alexandria is a water park.\n\n**Do not tell anyone.** Not because of timeline integrity — because everyone will immediately ask you to go back and buy Bitcoin, and you'll never hear the end of it.\n\nSafest first trip: go twenty minutes into the future, confirm the machine has a return function, come straight back. Boring, but you'll still exist.",
      },
    ],
  },
]
