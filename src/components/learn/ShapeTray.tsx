'use client'

import { useLearnStore } from '@/lib/learn-store'
import { Shape } from './Shape'
import { cn } from '@/lib/utils'
import type { LevelId, ShapeKind } from '@/lib/levels/types'
import type { ComponentProps } from 'react'

const LEVEL_SHAPES: Record<LevelId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

type ShapeTrayProps = ComponentProps<'div'>

export function ShapeTray({ className, ...props }: ShapeTrayProps) {
  const { isCompleted } = useLearnStore()

  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      {([1, 2, 3, 4, 5] as LevelId[]).map((id) => (
        <Shape key={id} kind={LEVEL_SHAPES[id]} size={32} earned={isCompleted(id)} />
      ))}
    </div>
  )
}
