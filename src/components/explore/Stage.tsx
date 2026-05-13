import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StageProps = {
  title: string
  caption?: string
  children: ReactNode
  className?: string
}

/**
 * Paper backdrop framing for every /explore experiment. The goal is the
 * feel of a Schlemmer notebook page: warm cream paper, thin ink contours,
 * a faint pencil grid. No dark digital backdrops — those read as 80s.
 *
 * The grain texture is an SVG turbulence noise multiplied onto the page so
 * the cream stays warm rather than going grey.
 */
export function Stage({ title, caption, children, className }: StageProps) {
  return (
    <section
      className={cn(
        'relative flex flex-col gap-5 border border-[var(--color-border-subtle)] bg-[var(--color-page)] p-6 text-[var(--color-text-primary)]',
        // Paper grain overlay — multiplies onto the cream so it stays warm.
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-[0.45] before:mix-blend-multiply before:[background-image:url('data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%270%200%20240%20240%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.9%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3CfeColorMatrix%20values%3D%270%200%200%200%200.55%20%200%200%200%200%200.5%20%200%200%200%200%200.42%20%200%200%200%200.2%200%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%23n)%27%2F%3E%3C%2Fsvg%3E')]",
        className,
      )}
    >
      <header className="relative flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg leading-tight tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h3>
        {caption && (
          <p className="font-serif italic text-[12px] text-[var(--color-text-tertiary)]">
            {caption}
          </p>
        )}
      </header>
      <div className="relative">{children}</div>
    </section>
  )
}
