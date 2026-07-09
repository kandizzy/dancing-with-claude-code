'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLearnStore } from '@/lib/learn-store'
import { Shape } from './Shape'
import { cn } from '@/lib/utils'
import { FIGURE_SHAPES, figureLabel } from '@/lib/figures/registry'
import type { FigureId } from '@/lib/figures/types'
import type { ComponentProps } from 'react'

type ShapeTrayProps = ComponentProps<'div'>

/**
 * Header shape row — it IS the figure navigation, not a progress readout, so
 * every cell works to earn that reading: hover animates the earned shape and
 * shows an instant label, and the current figure gets a visible ring.
 */
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
            aria-label={figureLabel(id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-center justify-center rounded-full p-1 transition-colors',
              isActive
                ? 'bg-state-active ring-1 ring-[color:var(--color-border-subtle)]'
                : 'hover:bg-state-hover',
            )}
          >
            <Shape kind={FIGURE_SHAPES[id]} size={28} earned={isCompleted(id)} animate="hover" />
            {/* Instant hover label (the native title tooltip's ~1s delay made these read
                as inert dots). pointer-events-none so it never traps the mouse. */}
            <span
              aria-hidden
              className="border-border-subtle bg-surface text-text-secondary shadow-popover pointer-events-none absolute right-0 top-full z-40 mt-1.5 hidden whitespace-nowrap rounded-md border px-2 py-1 text-[11px] group-hover:block group-focus-visible:block"
            >
              {figureLabel(id)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
