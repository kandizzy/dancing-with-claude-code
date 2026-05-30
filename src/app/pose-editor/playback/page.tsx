'use client'

/**
 * Minimal experiment: drive the Bauhaus shapes with a real captured dance.
 *
 * Loads an OAK-captured COCO-17 skeleton sequence from /api/capture, maps each
 * frame's keypoints 1:1 onto the dancer's five shape primitives, and plays back
 * at the source's wall-clock rate (~16.7 fps over ~45s).
 *
 * Deliberately minimal — no smoothing, no stylization, no skirt arcs, no
 * confidence filtering. The point is to see how raw motion-capture reads
 * through the Schlemmer vocabulary before deciding what to abstract.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

// --- types --------------------------------------------------------------

type Keypoint = [number, number, number, number] // [x, y, z, confidence]
type Skeleton = Keypoint[]
type Frame = {
  frame: number
  t: number
  skeleton: Skeleton[]
  hands: unknown[]
}

type Pt = { x: number; y: number }

// --- COCO-17 indices ----------------------------------------------------

const NOSE = 0
const L_EAR = 3
const R_EAR = 4
const L_SHOULDER = 5
const R_SHOULDER = 6
const L_ELBOW = 7
const R_ELBOW = 8
const L_WRIST = 9
const R_WRIST = 10
const L_HIP = 11
const R_HIP = 12
const L_KNEE = 13
const R_KNEE = 14
const L_ANKLE = 15
const R_ANKLE = 16

// --- viewport + palette -------------------------------------------------

const VIEW_W = 360
const VIEW_H = 460
const PAD = 24
const ARM_THICKNESS = 18
const HAND_RADIUS = 12
const HEAD_RADIUS = 30

const RED = 'var(--color-accent)'
const BLUE = 'var(--color-secondary)'
const OCHRE = 'var(--color-tertiary)'

// --- helpers ------------------------------------------------------------

function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

// Pick the highest-mean-confidence person when multiple are detected. Good
// enough for "see what it looks like" — no identity tracking across frames.
function pickPerson(skeletons: Skeleton[]): Skeleton | null {
  if (!skeletons || skeletons.length === 0) return null
  let best = skeletons[0]
  let bestConf = mean(best.map((k) => k[3]))
  for (let i = 1; i < skeletons.length; i++) {
    const conf = mean(skeletons[i].map((k) => k[3]))
    if (conf > bestConf) {
      best = skeletons[i]
      bestConf = conf
    }
  }
  return best
}

type Bbox = { xmin: number; xmax: number; ymin: number; ymax: number }

// Compute a single bbox across the entire sequence so the figure stays a
// consistent size (no zoom-jitter as the dancer moves around the frame).
function globalBbox(frames: Frame[]): Bbox | null {
  let xmin = Infinity
  let xmax = -Infinity
  let ymin = Infinity
  let ymax = -Infinity
  let any = false
  for (const f of frames) {
    const person = pickPerson(f.skeleton)
    if (!person) continue
    for (const k of person) {
      if (k[3] < 0.3) continue
      any = true
      if (k[0] < xmin) xmin = k[0]
      if (k[0] > xmax) xmax = k[0]
      if (k[1] < ymin) ymin = k[1]
      if (k[1] > ymax) ymax = k[1]
    }
  }
  if (!any) return null
  return { xmin, xmax, ymin, ymax }
}

function makeTransform(bbox: Bbox): (x: number, y: number) => Pt {
  const srcW = bbox.xmax - bbox.xmin
  const srcH = bbox.ymax - bbox.ymin
  const dstW = VIEW_W - 2 * PAD
  const dstH = VIEW_H - 2 * PAD
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const renderW = srcW * scale
  const renderH = srcH * scale
  const offsetX = (VIEW_W - renderW) / 2 - bbox.xmin * scale
  const offsetY = (VIEW_H - renderH) / 2 - bbox.ymin * scale
  return (x, y) => ({ x: x * scale + offsetX, y: y * scale + offsetY })
}

// Thicken a line segment p1→p2 into a 4-vertex quadrilateral with the given
// perpendicular thickness. Used for arm forearms (the "square" half of the
// arm composite, which in the original Dancer is a quadrilateral).
function thickQuad(p1: Pt, p2: Pt, thickness: number): Pt[] {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy) || 1
  const half = thickness / 2
  const nx = (-dy / len) * half
  const ny = (dx / len) * half
  return [
    { x: p1.x + nx, y: p1.y + ny },
    { x: p2.x + nx, y: p2.y + ny },
    { x: p2.x - nx, y: p2.y - ny },
    { x: p1.x - nx, y: p1.y - ny },
  ]
}

function pointsAttr(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

// --- component ----------------------------------------------------------

export default function PlaybackPage() {
  const [frames, setFrames] = useState<Frame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(true)

  // Load the JSONL once on mount.
  useEffect(() => {
    fetch('/api/capture')
      .then((r) => r.json())
      .then((data: { frames?: Frame[]; error?: string }) => {
        if (data.error) setError(data.error)
        else if (data.frames) setFrames(data.frames)
        else setError('no frames in response')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'fetch failed'))
  }, [])

  // Compute the global bbox + viewport transform once when frames arrive.
  const transform = useMemo(() => {
    if (!frames) return null
    const bbox = globalBbox(frames)
    if (!bbox) return null
    return makeTransform(bbox)
  }, [frames])

  // Playback loop: advance frameIdx based on each frame's `t` (capture
  // wall-clock), loop at the end.
  useEffect(() => {
    if (!frames || frames.length === 0 || !playing) return
    let raf = 0
    const t0 = frames[0].t
    const tN = frames[frames.length - 1].t
    const duration = tN - t0
    const startWall = performance.now()
    const startT = frames[frameIdx].t

    const tick = (now: number) => {
      const elapsed = (now - startWall) / 1000
      let target = startT + elapsed
      while (target > tN) target -= duration
      // Linear scan — at 745 frames this is trivially fast.
      let i = 0
      for (let j = 0; j < frames.length; j++) {
        if (frames[j].t <= target) i = j
        else break
      }
      setFrameIdx(i)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // We intentionally don't depend on frameIdx — including it would restart
    // the loop every frame. The startT capture above pins resume timing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, playing])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-danger m-0">Failed to load capture: {error}</p>
      </div>
    )
  }
  if (!frames || !transform) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-text-secondary m-0">Loading capture…</p>
      </div>
    )
  }

  const person = pickPerson(frames[frameIdx].skeleton)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-6">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-text-primary font-serif text-2xl m-0">
          Dance playback — raw 1:1 mapping
        </h1>
        <Link
          href="/pose-editor"
          className="text-text-tertiary hover:text-text-primary text-sm"
        >
          back to pose editor
        </Link>
      </header>

      <p className="text-text-secondary m-0 max-w-2xl text-sm leading-relaxed">
        COCO-17 keypoints from an OAK capture, mapped frame-by-frame to head /
        torso / legs / arms. No smoothing, no skirt, no stylization — just the
        raw signal so we can see what the abstraction needs to do.
      </p>

      <div className="border-border-subtle bg-page rounded-lg border p-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="mx-auto h-[540px] w-auto"
          role="img"
          aria-label="Bauhaus shapes following a captured dance"
        >
          {person ? <Body person={person} transform={transform} /> : null}
        </svg>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="border-border-subtle hover:bg-state-hover rounded-md border px-3 py-1.5"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="text-text-tertiary font-mono text-xs">
          frame {frameIdx + 1} / {frames.length} · t={frames[frameIdx].t.toFixed(2)}s
        </span>
      </div>
    </div>
  )
}

// --- body rendering -----------------------------------------------------

function Body({ person, transform }: { person: Skeleton; transform: (x: number, y: number) => Pt }) {
  // Project every keypoint we'll use into SVG space.
  const t = (i: number) => transform(person[i][0], person[i][1])
  const nose = t(NOSE)
  const lEar = t(L_EAR)
  const rEar = t(R_EAR)
  const lSh = t(L_SHOULDER)
  const rSh = t(R_SHOULDER)
  const lEl = t(L_ELBOW)
  const rEl = t(R_ELBOW)
  const lWr = t(L_WRIST)
  const rWr = t(R_WRIST)
  const lHip = t(L_HIP)
  const rHip = t(R_HIP)
  const lKnee = t(L_KNEE)
  const rKnee = t(R_KNEE)
  const lAnk = t(L_ANKLE)
  const rAnk = t(R_ANKLE)

  // Head radius scales lightly with ear distance, falls back to a fixed size
  // when ears aren't detected (avoids a giant head from a stray detection).
  const earDist = Math.hypot(lEar.x - rEar.x, lEar.y - rEar.y)
  const headRadius = earDist > 4 ? Math.min(earDist * 1.1, HEAD_RADIUS * 1.5) : HEAD_RADIUS

  // Torso quadrilateral: shoulders on top, hips on bottom. Order matters
  // for SVG polygon (CW or CCW, no crossing).
  const torso: Pt[] = [lSh, rSh, rHip, lHip]

  // Legs: triangles with hip, knee, ankle as the three vertices.
  const leftLeg: Pt[] = [lHip, lKnee, lAnk]
  const rightLeg: Pt[] = [rHip, rKnee, rAnk]

  // Arms: forearm is the upper-arm segment (shoulder→elbow) thickened to a
  // quad; hand is a circle at the wrist. Matches the Dancer's "ArmComposite"
  // = square + circle, just driven by live keypoints.
  const leftArm = thickQuad(lSh, lEl, ARM_THICKNESS)
  const rightArm = thickQuad(rSh, rEl, ARM_THICKNESS)

  return (
    <g>
      {/* Torso (blue square) — drawn first so it sits behind arms */}
      <polygon points={pointsAttr(torso)} fill={BLUE} opacity={0.85} />

      {/* Legs (charcoal/ink triangles) */}
      <polygon points={pointsAttr(leftLeg)} fill="var(--color-stage)" opacity={0.75} />
      <polygon points={pointsAttr(rightLeg)} fill="var(--color-stage)" opacity={0.75} />

      {/* Arms — forearm quad + hand circle, in ochre */}
      <polygon points={pointsAttr(leftArm)} fill={OCHRE} opacity={0.85} />
      <polygon points={pointsAttr(rightArm)} fill={OCHRE} opacity={0.85} />
      <circle cx={lWr.x} cy={lWr.y} r={HAND_RADIUS} fill={OCHRE} opacity={0.85} />
      <circle cx={rWr.x} cy={rWr.y} r={HAND_RADIUS} fill={OCHRE} opacity={0.85} />

      {/* Head (red circle) — drawn last so it sits on top */}
      <circle cx={nose.x} cy={nose.y} r={headRadius} fill={RED} opacity={0.9} />
    </g>
  )
}
