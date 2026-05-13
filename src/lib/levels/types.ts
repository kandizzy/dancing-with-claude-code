export type ShapeKind = 'circle' | 'triangle' | 'arc' | 'square' | 'composite'

export type LevelId = 1 | 2 | 3 | 4 | 5

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type LevelDefinition = {
  id: LevelId
  shape: ShapeKind
  title: string
  capability: string
  // Short intro shown above the workspace.
  intro: string
  // The directive the user is being asked to compose. Shown as guidance, not enforced.
  task: string
  // System prompt bound to every Claude call inside this level.
  systemPrompt: string
  // Fingerprint tokens whose presence in Claude's response proves the level's capability was exercised.
  // For L1, these only exist in the attached CLAUDE.md — finding any one proves Claude used the file.
  gateFingerprints: string[]
  // Copy shown on a non-matching response. Should nudge, not give the answer.
  nudgeOnMiss: string
  // Copy shown when the gate passes.
  successCopy: string
}
