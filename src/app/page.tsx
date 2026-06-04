'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { FIGURES } from '@/lib/figures/registry'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { ResetProgressButton } from '@/components/learn/ResetProgressButton'
import { ArrowRight } from 'lucide-react'
import {
  easeInOutCubic,
  lerpPoints,
  pointsToString,
  useRafLoop,
} from '@/lib/anim'
import type { FigureId, ShapeKind } from '@/lib/figures/types'

const FIGURE_SHAPES: Record<FigureId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

// ============================================================================
// Landing page — five figures laid out as a row of Shapes-style cells with
// verb-led titles below, plus a single "Let's begin" CTA that takes the user
// to /home (the workshop floor). The figures here are always shown in their
// earned + animated state — a preview of what the user is working toward.
//
// IMPORTANT: the per-cell shape rendering below is a STRAIGHT COPY of the
// rendering inside src/components/explore/ShapesShowcase.tsx (stroke widths,
// gradient stops, filter scale, motion phrasing). Duplication is intentional
// so the landing matches /explore exactly without coupling the canonical
// Shape component (used in ShapeTray at smaller sizes) to ShapesShowcase's
// visual choices.
// ============================================================================

// Motion phrase lengths chosen so no two shapes lock into the same rhythm.
const CIRCLE_BREATH_MS = 3600
const TRIANGLE_FRAME_MS = 1800
const TRIANGLE_HOLD_MS = 1200
const TRIANGLE_MORPH_MS = TRIANGLE_FRAME_MS - TRIANGLE_HOLD_MS
const ARC_TURN_MS = 7600
const SQUARE_TILT_MS = 4600
const COMPOSITE_ORBIT_MS = 4400

const CENTER_48 = 24

// Five plausible triangle poses — vertex-to-vertex morph order matches
// ShapesShowcase so motion is identical.
const TRIANGLE_TARGETS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[24, 6], [44, 42], [4, 42]],
  [[27, 8], [45, 41], [5, 43]],
  [[24, 4], [46, 42], [2, 42]],
  [[21, 8], [43, 43], [3, 41]],
  [[24, 10], [45, 40], [3, 40]],
]

const INK = 'var(--color-stage)'

type Tone = 'accent' | 'secondary' | 'tertiary' | 'stage' | 'mixed'

const FIGURE_TONES: Record<FigureId, Tone> = {
  1: 'accent',
  2: 'secondary',
  3: 'tertiary',
  4: 'stage',
  5: 'mixed',
}

function toneFillColor(tone: Tone) {
  if (tone === 'mixed') return 'var(--color-accent)'
  if (tone === 'stage') return 'var(--color-stage)'
  if (tone === 'accent') return 'var(--color-accent)'
  if (tone === 'secondary') return 'var(--color-secondary)'
  if (tone === 'tertiary') return 'var(--color-tertiary)'
  return INK
}

function toneAltColor(tone: Tone) {
  return tone === 'mixed' ? 'var(--color-secondary)' : toneFillColor(tone)
}

export default function Landing() {
  const figures: FigureId[] = [1, 2, 3, 4, 5]

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-8 overflow-hidden px-6 py-6">
      <LearnHeader />

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex w-full flex-col items-center gap-3">
          <p className="font-script text-text-tertiary text-xl italic">
            The score before the dance
          </p>
          <h1 className="text-text-primary max-w-3xl text-center font-serif text-3xl leading-tight">
            Five moves for working with Claude Code, learned by doing.
          </h1>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-5">
          {figures.map((id) => {
            const def = FIGURES[id]
            return (
              <FigureCell
                key={id}
                figureId={id}
                shape={FIGURE_SHAPES[id]}
                tone={FIGURE_TONES[id]}
                title={def.title}
              />
            )
          })}
        </div>

        <Link
          href="/home"
          className="bg-text-primary text-page hover:bg-text-secondary inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Let&apos;s begin
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <footer className="flex items-center justify-between gap-4">
        <span className="font-script text-text-tertiary text-sm italic">
          After Oskar Schlemmer · Bauhaus dances, 1922–1929
        </span>
        <ResetProgressButton />
      </footer>
    </div>
  )
}

// One figure cell, rendered with ShapesShowcase's exact visual rules.
function FigureCell({
  figureId,
  shape,
  tone,
  title,
}: {
  figureId: FigureId
  shape: ShapeKind
  tone: Tone
  title: string
}) {
  const shapeGroupRef = useRef<SVGGElement | null>(null)
  const triRef = useRef<SVGPolygonElement | null>(null)
  const secondaryRef = useRef<SVGGElement | null>(null)

  useRafLoop((elapsed) => {
    switch (shape) {
      case 'circle': {
        const t = (elapsed % CIRCLE_BREATH_MS) / CIRCLE_BREATH_MS
        const breath = 1 + Math.sin(t * Math.PI * 2) * 0.05
        shapeGroupRef.current?.setAttribute(
          'transform',
          `translate(${CENTER_48 * (1 - breath)} ${CENTER_48 * (1 - breath)}) scale(${breath.toFixed(3)})`,
        )
        return
      }
      case 'triangle': {
        const slot = elapsed % TRIANGLE_FRAME_MS
        const idx = Math.floor(elapsed / TRIANGLE_FRAME_MS) % TRIANGLE_TARGETS.length
        const next = (idx + 1) % TRIANGLE_TARGETS.length
        let pts: ReadonlyArray<readonly [number, number]>
        if (slot >= TRIANGLE_HOLD_MS) {
          const local = (slot - TRIANGLE_HOLD_MS) / TRIANGLE_MORPH_MS
          pts = lerpPoints(
            TRIANGLE_TARGETS[idx],
            TRIANGLE_TARGETS[next],
            easeInOutCubic(Math.min(local, 1)),
          )
        } else {
          pts = TRIANGLE_TARGETS[idx]
        }
        triRef.current?.setAttribute('points', pointsToString(pts))
        return
      }
      case 'arc': {
        const t = (elapsed % ARC_TURN_MS) / ARC_TURN_MS
        shapeGroupRef.current?.setAttribute(
          'transform',
          `rotate(${(t * 360).toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        return
      }
      case 'square': {
        const t = (elapsed % SQUARE_TILT_MS) / SQUARE_TILT_MS
        const wobble = Math.sin(t * Math.PI * 2)
        const angle = Math.sign(wobble) * Math.pow(Math.abs(wobble), 0.5) * 8
        shapeGroupRef.current?.setAttribute(
          'transform',
          `rotate(${angle.toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        return
      }
      case 'composite': {
        const t = (elapsed % COMPOSITE_ORBIT_MS) / COMPOSITE_ORBIT_MS
        shapeGroupRef.current?.setAttribute(
          'transform',
          `rotate(${(t * 360).toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        const focus = 1 + Math.sin(t * Math.PI * 4) * 0.06
        secondaryRef.current?.setAttribute(
          'transform',
          `translate(${32 * (1 - focus)} ${32 * (1 - focus)}) scale(${focus.toFixed(3)})`,
        )
        return
      }
    }
  })

  const fillColor = toneFillColor(tone)
  const altColor = toneAltColor(tone)
  const washId = `landing-wash-${figureId}`
  const fillId = `landing-fill-${figureId}`
  const fillAltId = `landing-fill-alt-${figureId}`
  const edgeId = `landing-edge-${figureId}`

  return (
    <Link
      href={`/learn/${figureId}`}
      aria-label={`${title} — figure ${figureId}`}
      className="group flex flex-col items-center gap-3"
    >
      <div className="border-border-subtle group-hover:border-text-tertiary relative flex aspect-square w-full items-center justify-center rounded-sm border border-dashed transition-colors">
        <span className="text-text-tertiary absolute left-3 top-2 font-mono text-[10px] uppercase tracking-widest">
          fig. {figureId}
        </span>
        <svg
          viewBox="-6 -6 60 60"
          className="h-[72%] w-[72%]"
          role="img"
          aria-label={`${shape} earned`}
        >
          <defs>
            {/* Same gradient grammar as ShapesShowcase */}
            <radialGradient id={washId} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.13} />
              <stop offset="60%" stopColor={fillColor} stopOpacity={0.06} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </radialGradient>
            <linearGradient id={fillId} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0.22} />
            </linearGradient>
            <linearGradient id={fillAltId} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={altColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={altColor} stopOpacity={0.22} />
            </linearGradient>
            <filter id={edgeId} x="-3%" y="-3%" width="106%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="0.4" />
            </filter>
          </defs>

          {/* Ambient wash */}
          <circle cx={CENTER_48} cy={CENTER_48} r={26} fill={`url(#${washId})`} />

          {/* Shape — ink-edge filter on the shape itself, not the wash */}
          <g filter={`url(#${edgeId})`}>
            <g ref={shapeGroupRef}>
              {shape === 'circle' && (
                <circle
                  cx={CENTER_48}
                  cy={CENTER_48}
                  r={18}
                  fill={`url(#${fillId})`}
                  stroke={INK}
                  strokeWidth={0.55}
                />
              )}
              {shape === 'triangle' && (
                <polygon
                  ref={triRef}
                  points="24,6 44,42 4,42"
                  fill={`url(#${fillId})`}
                  stroke={INK}
                  strokeWidth={0.55}
                  strokeLinejoin="round"
                />
              )}
              {shape === 'arc' && (
                <path
                  d="M 6 36 A 18 18 0 0 1 42 36"
                  fill="none"
                  stroke={INK}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                />
              )}
              {shape === 'square' && (
                <rect
                  x={8}
                  y={8}
                  width={32}
                  height={32}
                  fill={`url(#${fillId})`}
                  stroke={INK}
                  strokeWidth={0.55}
                />
              )}
              {shape === 'composite' && (
                <>
                  <circle
                    cx={16}
                    cy={16}
                    r={10}
                    fill={`url(#${fillId})`}
                    stroke={INK}
                    strokeWidth={0.55}
                  />
                  <g ref={secondaryRef}>
                    <rect
                      x={22}
                      y={22}
                      width={20}
                      height={20}
                      fill={`url(#${fillAltId})`}
                      stroke={INK}
                      strokeWidth={0.55}
                    />
                  </g>
                </>
              )}
            </g>
          </g>
        </svg>
      </div>
      <p className="text-text-secondary group-hover:text-text-primary text-center font-serif text-[13px] italic leading-snug transition-colors">
        {title}
      </p>
    </Link>
  )
}
