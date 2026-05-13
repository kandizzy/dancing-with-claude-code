import type { LevelDefinition, LevelId } from './types'
import { level1 } from './level-1'

// Levels 2–5 are stubs we'll fill as each lands.
export const LEVELS: Record<LevelId, LevelDefinition | null> = {
  1: level1,
  2: null,
  3: null,
  4: null,
  5: null,
}

export function getLevel(id: number): LevelDefinition | null {
  if (id < 1 || id > 5) return null
  return LEVELS[id as LevelId] ?? null
}

export function findGateMatch(text: string, fingerprints: string[]): string | null {
  const lower = text.toLowerCase()
  for (const fp of fingerprints) {
    if (lower.includes(fp.toLowerCase())) return fp
  }
  return null
}
