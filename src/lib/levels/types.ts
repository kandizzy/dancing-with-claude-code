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
  // One-click first-asks shown in the empty chat state. Disappear after first send.
  suggestedPrompts?: string[]
}
