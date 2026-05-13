import { cn } from '@/lib/utils'
import type { ShapeKind } from '@/lib/levels/types'
import type { ComponentProps } from 'react'

type ShapeProps = ComponentProps<'svg'> & {
  kind: ShapeKind
  size?: number
  earned?: boolean
}

// Per-figure Bauhaus palette. Each shape carries Schlemmer's primaries:
// Circle (Figure 1) = red, Triangle (2) = blue, Arc (3) = ochre, Square (4) = charcoal,
// Composite (5) = red + blue partnership.
const PALETTE: Record<ShapeKind, { fill: string; stroke: string }> = {
  circle: { fill: 'var(--color-accent)', stroke: 'var(--color-accent-strong)' },
  triangle: { fill: 'var(--color-secondary)', stroke: 'var(--color-secondary-strong)' },
  arc: { fill: 'var(--color-tertiary)', stroke: 'var(--color-tertiary-strong)' },
  square: { fill: 'var(--color-stage)', stroke: 'var(--color-stage)' },
  composite: { fill: 'var(--color-accent)', stroke: 'var(--color-accent-strong)' },
}

export function Shape({ kind, size = 48, earned = false, className, ...props }: ShapeProps) {
  const p = PALETTE[kind]
  const fill = earned ? p.fill : 'transparent'
  const stroke = earned ? p.stroke : 'var(--color-border-subtle)'

  // Composite has two shapes; only the second uses the partner color (blue) so the
  // figure reads as a couple — red lead, blue partner.
  const compositeSecondaryFill = earned ? 'var(--color-secondary)' : 'transparent'
  const compositeSecondaryStroke = earned
    ? 'var(--color-secondary-strong)'
    : 'var(--color-border-subtle)'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      aria-label={earned ? `${kind} earned` : `${kind} locked`}
      {...props}
    >
      {kind === 'circle' && (
        <circle cx="24" cy="24" r="18" fill={fill} stroke={stroke} strokeWidth="2" />
      )}
      {kind === 'triangle' && (
        <polygon
          points="24,6 44,42 4,42"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {kind === 'arc' && (
        <path
          d="M 6 36 A 18 18 0 0 1 42 36"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {kind === 'square' && (
        <rect x="8" y="8" width="32" height="32" fill={fill} stroke={stroke} strokeWidth="2" />
      )}
      {kind === 'composite' && (
        <>
          <circle cx="16" cy="16" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect
            x="22"
            y="22"
            width="20"
            height="20"
            fill={compositeSecondaryFill}
            stroke={compositeSecondaryStroke}
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  )
}
