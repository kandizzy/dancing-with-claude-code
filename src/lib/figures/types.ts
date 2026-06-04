export type ShapeKind = 'circle' | 'triangle' | 'arc' | 'square' | 'composite'

export type FigureId = 1 | 2 | 3 | 4 | 5

export type FigureStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type FigureDefinition = {
  id: FigureId
  shape: ShapeKind
  title: string
  capability: string
  intro: string
  task: string
  /**
   * Short "did you know" teaching lines rotated during the wait while Claude works (see
   * WaitingTips). Optional and figure-agnostic — a figure with no tips simply shows none.
   */
  tips?: string[]
}
