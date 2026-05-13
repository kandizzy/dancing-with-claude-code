export type ShapeKind = 'circle' | 'triangle' | 'arc' | 'square' | 'composite'

export type LevelId = 1 | 2 | 3 | 4 | 5

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type LevelDefinition = {
  id: LevelId
  shape: ShapeKind
  title: string
  capability: string
  intro: string
  task: string
}

// CLAUDE.md is live, user-mutable state. Built up as the user works.
export type UserEntry = {
  id: string
  text: string
  source: 'user' | 'claude'
  promotedAt: number
}

export type ClaudeMdState = {
  // Seeded project context — describes what the playground is. The user can read it; v1 makes it readonly.
  stack: string
  // Behavior rules for Claude. Seeded with defaults; user can add/remove/edit.
  behavior: string[]
  // Notes/recipes the user has pinned by promoting a Claude reply or writing their own. Empty at seed.
  userEntries: UserEntry[]
}
