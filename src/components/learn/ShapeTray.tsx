'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLearnStore } from '@/lib/learn-store'
import { Shape } from './Shape'
import { cn } from '@/lib/utils'
import type { FigureId, ShapeKind } from '@/lib/figures/types'
import type { ComponentProps } from 'react'

const FIGURE_SHAPES: Record<FigureId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

const FIGURE_TITLES: Record<FigureId, string> = {
  1: 'Figure 1 · Write a CLAUDE.md',
  2: 'Figure 2 · Try a slash command',
  3: 'Figure 3 · Write a directive, not a chat',
  4: 'Figure 4 · Read the diff before you accept',
  5: 'Figure 5 · Make a branch, then ask',
}

type ShapeTrayProps = ComponentProps<'div'>

export function ShapeTray({ className, ...props }: ShapeTrayProps) {
  const { isCompleted } = useLearnStore()
  const pathname = usePathname()
  // Active figure id is parsed from /learn/<n>. On / it's null.
  const match = pathname?.match(/^\/learn\/(\d+)/)
  const activeId = match ? (Number(match[1]) as FigureId) : null

  return (
    <nav
      aria-label="Figures"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {([1, 2, 3, 4, 5] as FigureId[]).map((id) => {
        const isActive = id === activeId
        return (
          <Link
            key={id}
            href={`/learn/${id}`}
            aria-label={FIGURE_TITLES[id]}
            title={FIGURE_TITLES[id]}
            className={cn(
              'flex items-center justify-center rounded-full p-1 transition-colors',
              isActive ? 'bg-state-active' : 'hover:bg-state-hover',
            )}
          >
            <Shape kind={FIGURE_SHAPES[id]} size={28} earned={isCompleted(id)} />
          </Link>
        )
      })}
    </nav>
  )
}
