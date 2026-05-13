import { cn } from '@/lib/utils'
import type { ShapeKind } from '@/lib/levels/types'
import type { ComponentProps } from 'react'

type ShapeProps = ComponentProps<'svg'> & {
  kind: ShapeKind
  size?: number
  earned?: boolean
}

// Bauhaus-flavored shape palette. Earned shapes are filled with accent; unearned are outlined ghost.
export function Shape({ kind, size = 48, earned = false, className, ...props }: ShapeProps) {
  const fill = earned ? 'var(--color-accent)' : 'transparent'
  const stroke = earned ? 'var(--color-accent-strong)' : 'var(--color-border-subtle)'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      aria-label={earned ? `${kind} earned` : `${kind} locked`}
      {...props}
    >
      {kind === 'circle' && <circle cx="24" cy="24" r="18" fill={fill} stroke={stroke} strokeWidth="2" />}
      {kind === 'triangle' && (
        <polygon points="24,6 44,42 4,42" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
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
      {kind === 'square' && <rect x="8" y="8" width="32" height="32" fill={fill} stroke={stroke} strokeWidth="2" />}
      {kind === 'composite' && (
        <>
          <circle cx="16" cy="16" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="22" y="22" width="20" height="20" fill={fill} stroke={stroke} strokeWidth="2" />
        </>
      )}
    </svg>
  )
}
