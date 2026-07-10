'use client'

import { FigureThinking } from './FigureThinking'
import { WaitingTips } from './WaitingTips'
import { cn } from '@/lib/utils'
import type { ShapeKind } from '@/lib/figures/types'

/**
 * The shared "Claude is working" wait treatment: the figure's own shape sketching itself in
 * (with the trace dot riding it — every figure's wait traces its own shape, per the design
 * direction), a caption, and rotating teaching tips. One component so every figure's wait
 * looks and teaches the same way. Sizing rule: default 120 for the form-shaped figures;
 * chat transcripts (1, 2) opt into 180 explicitly — the sketch is the signature wait.
 */
export function ThinkingState({
  kind,
  tips,
  label = 'claude is working…',
  size = 120,
  className,
}: {
  kind: ShapeKind
  tips?: string[]
  label?: string
  size?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-8', className)} aria-live="polite">
      <FigureThinking kind={kind} size={size} />
      <div className="font-display text-text-tertiary text-xs lowercase tracking-[0.14em]">
        {label}
      </div>
      <WaitingTips tips={tips} className="mt-1 max-w-sm" />
    </div>
  )
}
