'use client'

import { FigureThinking } from './FigureThinking'
import { WaitingTips } from './WaitingTips'
import { cn } from '@/lib/utils'
import type { ShapeKind } from '@/lib/figures/types'

/**
 * The shared "Claude is working" wait treatment: the figure's own shape sketching itself in,
 * a caption, and rotating teaching tips. One component so every figure's wait looks and teaches
 * the same way. `noteInPlay` is Figure 1's "note takes the stage" beat; other figures leave it
 * off. Sizing rule: default 96 for the form-shaped figures; chat transcripts (1, 2) opt into
 * 140 explicitly — they have the vertical room.
 */
export function ThinkingState({
  kind,
  tips,
  noteInPlay = false,
  label = 'claude is working…',
  size = 96,
  className,
}: {
  kind: ShapeKind
  tips?: string[]
  noteInPlay?: boolean
  label?: string
  size?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-8', className)} aria-live="polite">
      <FigureThinking kind={kind} noteInPlay={noteInPlay} size={size} />
      <div className="text-text-tertiary text-xs">{label}</div>
      <WaitingTips tips={tips} className="mt-1 max-w-sm" />
    </div>
  )
}
