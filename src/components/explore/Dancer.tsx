'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

// Marionette dancer assembled from the 5 earned shapes. Schlemmer's
// "synthesis of man and marionette" — figure is constructed, not anatomical.
// Each earned shape plays a body role:
//   • CIRCLE    → head (small sphere)
//   • ARC       → banded watercolor halo behind the head (Triadic-Ballet
//                 disc costume, from the dance still in image 2)
//   • TRIANGLE  → upper torso, point-down to waist
//   • SQUARE    → pelvis block
//   • COMPOSITE → handheld prop (red disc + blue square pair)
// Limbs are stick lines articulated at small filled-circle joints —
// shoulders, elbows, hands, hips, knees, feet. The figure holds discrete
// poses and snaps between them (Schlemmer grid choreography), with the
// halo turning slowly behind. No smooth ballet phrasing.

const W = 280
const H = 360
const SPINE_X = 140
const FLOOR = 320

// Stacked body landmarks
const HEAD_CY = 96
const HEAD_R = 13
const NECK_BOTTOM_Y = 122
const SHOULDER_Y = 132
const WAIST_Y = 186
const HIP_Y = 220
const PELVIS_HALF_W = 22
const PELVIS_HEIGHT = 34
const KNEE_Y = 270
const FOOT_Y = 316

// Halo (the ARC shape, reimagined as a banded watercolor disc)
const HALO_R = 56

// Joint visual radius
const JOINT_R = 2.5
const FOOT_R = 3.2

// Arm reach landmarks
const SHOULDER_HALF = 26 // shoulders at SPINE_X ± SHOULDER_HALF
const ELBOW_OUT = 38 // elbow x offset from spine at the "out" pose
const HAND_DOWN_Y = 200
const HAND_OUT_Y = 156

// Leg landmarks
const HIP_OFFSET = 12
const KNEE_OFFSET_HELD = 14
const FOOT_OFFSET = 18

// Phrase lengths — incommensurate so the figure never falls into pattern.
const HALO_TURN_MS = 11000 // slow, hieratic
const HEAD_TILT_FRAME_MS = 1700 // 1200 hold + 500 snap
const HEAD_TILT_HOLD_MS = 1200
const ARM_FRAME_MS = 2600 // 2000 hold + 600 snap
const ARM_HOLD_MS = 2000
const BODY_BREATH_MS = 6800
const PROP_ORBIT_MS = 4400

// Head tilt sequence — 3 positions in a marionette pattern
const HEAD_TILTS = [-10, 0, 10, 0] // degrees, looping

// Arm pose sequence — each pose is [shoulder->elbow vector, elbow->hand vector]
// for the right arm; left arm mirrors. Held positions only, no in-between.
type ArmPose = {
  // Right shoulder is at (SPINE_X + SHOULDER_HALF, SHOULDER_Y).
  // Coords below are absolute targets for elbow + hand on the right side.
  elbow: readonly [number, number]
  hand: readonly [number, number]
}
const ARM_POSES_R: ReadonlyArray<ArmPose> = [
  // Pose 0: arms down at sides
  { elbow: [SPINE_X + 24, 178], hand: [SPINE_X + 22, HAND_DOWN_Y + 4] },
  // Pose 1: right arm out horizontal, holding the prop
  { elbow: [SPINE_X + ELBOW_OUT, SHOULDER_Y + 8], hand: [SPINE_X + ELBOW_OUT + 18, HAND_OUT_Y] },
  // Pose 2: arms slightly raised at sides
  { elbow: [SPINE_X + 28, 168], hand: [SPINE_X + 32, HAND_OUT_Y + 18] },
]

export function Dancer() {
  const bodyRef = useRef<SVGGElement | null>(null)
  const haloRef = useRef<SVGGElement | null>(null)
  const headRef = useRef<SVGGElement | null>(null)
  const armRightRef = useRef<SVGGElement | null>(null)
  const armLeftRef = useRef<SVGGElement | null>(null)
  const propRef = useRef<SVGGElement | null>(null)
  const spotlightRef = useRef<SVGCircleElement | null>(null)

  // Pose lerp helper — joints snap between targets with easeInOutCubic
  // during the snap window, otherwise hold the destination.
  const armLine = (g: SVGGElement | null, pose: ArmPose, mirror: boolean) => {
    if (!g) return
    const elbowX = mirror ? 2 * SPINE_X - pose.elbow[0] : pose.elbow[0]
    const handX = mirror ? 2 * SPINE_X - pose.hand[0] : pose.hand[0]
    const shoulderX = mirror ? SPINE_X - SHOULDER_HALF : SPINE_X + SHOULDER_HALF
    const lines = g.querySelectorAll<SVGLineElement>('line')
    if (lines.length >= 2) {
      // upper arm: shoulder → elbow
      lines[0].setAttribute('x1', `${shoulderX}`)
      lines[0].setAttribute('y1', `${SHOULDER_Y}`)
      lines[0].setAttribute('x2', `${elbowX.toFixed(2)}`)
      lines[0].setAttribute('y2', `${pose.elbow[1].toFixed(2)}`)
      // forearm: elbow → hand
      lines[1].setAttribute('x1', `${elbowX.toFixed(2)}`)
      lines[1].setAttribute('y1', `${pose.elbow[1].toFixed(2)}`)
      lines[1].setAttribute('x2', `${handX.toFixed(2)}`)
      lines[1].setAttribute('y2', `${pose.hand[1].toFixed(2)}`)
    }
    const joints = g.querySelectorAll<SVGCircleElement>('circle')
    if (joints.length >= 2) {
      joints[0].setAttribute('cx', `${elbowX.toFixed(2)}`)
      joints[0].setAttribute('cy', `${pose.elbow[1].toFixed(2)}`)
      joints[1].setAttribute('cx', `${handX.toFixed(2)}`)
      joints[1].setAttribute('cy', `${pose.hand[1].toFixed(2)}`)
    }
  }

  const lerpPose = (from: ArmPose, to: ArmPose, t: number): ArmPose => ({
    elbow: [
      from.elbow[0] + (to.elbow[0] - from.elbow[0]) * t,
      from.elbow[1] + (to.elbow[1] - from.elbow[1]) * t,
    ],
    hand: [
      from.hand[0] + (to.hand[0] - from.hand[0]) * t,
      from.hand[1] + (to.hand[1] - from.hand[1]) * t,
    ],
  })

  useRafLoop((elapsed) => {
    // Halo: slow rotation behind the figure. Hieratic, like a turning
    // costume disc on stage.
    const haloT = (elapsed % HALO_TURN_MS) / HALO_TURN_MS
    haloRef.current?.setAttribute(
      'transform',
      `rotate(${(haloT * 360).toFixed(2)} ${SPINE_X} ${HEAD_CY})`,
    )

    // Head tilt: 4 held positions (−10°, 0°, +10°, 0°) with quick snaps.
    const hSlot = elapsed % HEAD_TILT_FRAME_MS
    const hStep = Math.floor(elapsed / HEAD_TILT_FRAME_MS) % HEAD_TILTS.length
    const hNext = (hStep + 1) % HEAD_TILTS.length
    let headAngle: number
    if (hSlot >= HEAD_TILT_HOLD_MS) {
      const local = (hSlot - HEAD_TILT_HOLD_MS) / (HEAD_TILT_FRAME_MS - HEAD_TILT_HOLD_MS)
      headAngle =
        HEAD_TILTS[hStep] +
        easeInOutCubic(Math.min(local, 1)) * (HEAD_TILTS[hNext] - HEAD_TILTS[hStep])
    } else {
      headAngle = HEAD_TILTS[hStep]
    }
    headRef.current?.setAttribute(
      'transform',
      `rotate(${headAngle.toFixed(2)} ${SPINE_X} ${HEAD_CY})`,
    )

    // Arms: cycle through ARM_POSES_R with held positions + snap transitions.
    const aSlot = elapsed % ARM_FRAME_MS
    const aStep = Math.floor(elapsed / ARM_FRAME_MS) % ARM_POSES_R.length
    const aNext = (aStep + 1) % ARM_POSES_R.length
    const armT =
      aSlot >= ARM_HOLD_MS
        ? easeInOutCubic(Math.min((aSlot - ARM_HOLD_MS) / (ARM_FRAME_MS - ARM_HOLD_MS), 1))
        : 0
    const armPose = lerpPose(ARM_POSES_R[aStep], ARM_POSES_R[aNext], armT)
    armLine(armRightRef.current, armPose, false)
    armLine(armLeftRef.current, armPose, true)

    // Body breath — tiny vertical bob, like a marionette held on string.
    const breathT = (elapsed % BODY_BREATH_MS) / BODY_BREATH_MS
    const bob = Math.sin(breathT * Math.PI * 2) * 1.5
    bodyRef.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`)

    // Prop (composite): travels with the right hand. Position derived from
    // current arm pose, with a small orbit so it reads as held-but-active.
    const propT = (elapsed % PROP_ORBIT_MS) / PROP_ORBIT_MS
    const orbitAngle = propT * Math.PI * 2
    const orbitR = 5
    const handX = armPose.hand[0]
    const handY = armPose.hand[1]
    propRef.current?.setAttribute(
      'transform',
      `translate(${(handX - 0 + orbitR * Math.cos(orbitAngle)).toFixed(2)} ${(handY + orbitR * Math.sin(orbitAngle)).toFixed(2)})`,
    )

    // Spotlight breathing
    const sT = (elapsed % 6400) / 6400
    if (spotlightRef.current) {
      spotlightRef.current.setAttribute('r', (90 * (1 + Math.sin(sT * Math.PI * 2) * 0.04)).toFixed(2))
    }
  })

  return (
    <Stage
      title="Dancer"
      caption="Marionette assembled from the five earned shapes"
    >
      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[460px] w-auto"
          role="img"
          aria-label="A Schlemmer-style marionette dancer built from the prototype's earned shapes"
        >
          <defs>
            {/* Banded halo — 4 watercolor wedges in the project's tones.
                Mimics the colored discs worn in the Triadic Ballet (image 2). */}
            <radialGradient id="halo-band-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.05" />
            </radialGradient>
            <radialGradient id="halo-band-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity="0.05" />
            </radialGradient>
            <radialGradient id="halo-band-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.05" />
            </radialGradient>
            <radialGradient id="halo-band-d" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-stage)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-stage)" stopOpacity="0.04" />
            </radialGradient>
            <radialGradient id="spotlight-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
              <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="torso-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.26" />
            </linearGradient>
            <linearGradient id="pelvis-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-stage)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--color-stage)" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="head-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            </linearGradient>
            <filter id="ink-edge" x="-3%" y="-3%" width="106%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" />
              <feDisplacementMap in="SourceGraphic" scale="0.4" />
            </filter>
          </defs>

          {/* Spotlight pool behind the figure */}
          <circle ref={spotlightRef} cx={SPINE_X} cy={HIP_Y - 30} r={90} fill="url(#spotlight-wash)" />

          {/* Halo (ARC) — banded watercolor disc behind the head, slowly
              rotating. Built from four overlapping quarter-arc wedges, each
              filled with a different tone. */}
          <g ref={haloRef}>
            {[
              { id: 'halo-band-a', start: -90, end: 0 },
              { id: 'halo-band-b', start: 0, end: 90 },
              { id: 'halo-band-c', start: 90, end: 180 },
              { id: 'halo-band-d', start: 180, end: 270 },
            ].map((b, i) => {
              const a1 = (b.start * Math.PI) / 180
              const a2 = (b.end * Math.PI) / 180
              const p1x = SPINE_X + HALO_R * Math.cos(a1)
              const p1y = HEAD_CY + HALO_R * Math.sin(a1)
              const p2x = SPINE_X + HALO_R * Math.cos(a2)
              const p2y = HEAD_CY + HALO_R * Math.sin(a2)
              return (
                <path
                  key={i}
                  d={`M ${SPINE_X} ${HEAD_CY} L ${p1x} ${p1y} A ${HALO_R} ${HALO_R} 0 0 1 ${p2x} ${p2y} Z`}
                  fill={`url(#${b.id})`}
                />
              )
            })}
            {/* Thin ring outline so the halo edge reads */}
            <circle
              cx={SPINE_X}
              cy={HEAD_CY}
              r={HALO_R}
              fill="none"
              stroke="var(--color-stage)"
              strokeWidth={0.4}
              opacity={0.35}
            />
          </g>

          {/* Body group — everything below the halo translates together
              for the breath bob */}
          <g ref={bodyRef} filter="url(#ink-edge)">
            {/* Floor — a soft pencil rule */}
            <line
              x1={32}
              x2={W - 32}
              y1={FLOOR}
              y2={FLOOR}
              stroke="var(--color-text-tertiary)"
              strokeWidth={0.5}
            />

            {/* Neck — single thin ink stroke */}
            <line
              x1={SPINE_X}
              x2={SPINE_X}
              y1={HEAD_CY + HEAD_R}
              y2={NECK_BOTTOM_Y}
              stroke="var(--color-stage)"
              strokeWidth={0.7}
            />

            {/* TRIANGLE — upper torso, point-down, shoulder line at top */}
            <polygon
              points={`${SPINE_X - SHOULDER_HALF},${SHOULDER_Y} ${SPINE_X + SHOULDER_HALF},${SHOULDER_Y} ${SPINE_X},${WAIST_Y}`}
              fill="url(#torso-fill)"
              stroke="var(--color-stage)"
              strokeWidth={0.55}
              strokeLinejoin="round"
            />

            {/* SQUARE — pelvis block, hangs from triangle apex */}
            <rect
              x={SPINE_X - PELVIS_HALF_W}
              y={HIP_Y - 14}
              width={PELVIS_HALF_W * 2}
              height={PELVIS_HEIGHT}
              fill="url(#pelvis-fill)"
              stroke="var(--color-stage)"
              strokeWidth={0.55}
            />

            {/* Shoulder joints */}
            <circle cx={SPINE_X - SHOULDER_HALF} cy={SHOULDER_Y} r={JOINT_R} fill="var(--color-stage)" />
            <circle cx={SPINE_X + SHOULDER_HALF} cy={SHOULDER_Y} r={JOINT_R} fill="var(--color-stage)" />

            {/* Right arm — stick limbs with elbow + hand joints. Initial
                points come from ARM_POSES_R[0]; rAF updates them each frame. */}
            <g ref={armRightRef}>
              <line
                x1={SPINE_X + SHOULDER_HALF}
                y1={SHOULDER_Y}
                x2={ARM_POSES_R[0].elbow[0]}
                y2={ARM_POSES_R[0].elbow[1]}
                stroke="var(--color-stage)"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              <line
                x1={ARM_POSES_R[0].elbow[0]}
                y1={ARM_POSES_R[0].elbow[1]}
                x2={ARM_POSES_R[0].hand[0]}
                y2={ARM_POSES_R[0].hand[1]}
                stroke="var(--color-stage)"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              <circle cx={ARM_POSES_R[0].elbow[0]} cy={ARM_POSES_R[0].elbow[1]} r={JOINT_R} fill="var(--color-stage)" />
              <circle cx={ARM_POSES_R[0].hand[0]} cy={ARM_POSES_R[0].hand[1]} r={JOINT_R} fill="var(--color-stage)" />
            </g>

            {/* Left arm — mirror */}
            <g ref={armLeftRef}>
              <line
                x1={SPINE_X - SHOULDER_HALF}
                y1={SHOULDER_Y}
                x2={2 * SPINE_X - ARM_POSES_R[0].elbow[0]}
                y2={ARM_POSES_R[0].elbow[1]}
                stroke="var(--color-stage)"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              <line
                x1={2 * SPINE_X - ARM_POSES_R[0].elbow[0]}
                y1={ARM_POSES_R[0].elbow[1]}
                x2={2 * SPINE_X - ARM_POSES_R[0].hand[0]}
                y2={ARM_POSES_R[0].hand[1]}
                stroke="var(--color-stage)"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              <circle cx={2 * SPINE_X - ARM_POSES_R[0].elbow[0]} cy={ARM_POSES_R[0].elbow[1]} r={JOINT_R} fill="var(--color-stage)" />
              <circle cx={2 * SPINE_X - ARM_POSES_R[0].hand[0]} cy={ARM_POSES_R[0].hand[1]} r={JOINT_R} fill="var(--color-stage)" />
            </g>

            {/* Hips + knee + foot joints, stick legs (static held pose) */}
            {[1, -1].map((side) => {
              const hipX = SPINE_X + side * HIP_OFFSET
              const kneeX = SPINE_X + side * KNEE_OFFSET_HELD
              const footX = SPINE_X + side * FOOT_OFFSET
              return (
                <g key={side}>
                  {/* thigh */}
                  <line
                    x1={hipX}
                    y1={HIP_Y + 16}
                    x2={kneeX}
                    y2={KNEE_Y}
                    stroke="var(--color-stage)"
                    strokeWidth={0.9}
                    strokeLinecap="round"
                  />
                  {/* shin */}
                  <line
                    x1={kneeX}
                    y1={KNEE_Y}
                    x2={footX}
                    y2={FOOT_Y}
                    stroke="var(--color-stage)"
                    strokeWidth={0.9}
                    strokeLinecap="round"
                  />
                  {/* hip joint */}
                  <circle cx={hipX} cy={HIP_Y + 16} r={JOINT_R} fill="var(--color-stage)" />
                  {/* knee joint */}
                  <circle cx={kneeX} cy={KNEE_Y} r={JOINT_R} fill="var(--color-stage)" />
                  {/* foot — slightly larger disc, like a marionette weight */}
                  <circle cx={footX} cy={FOOT_Y} r={FOOT_R} fill="var(--color-stage)" />
                </g>
              )
            })}

            {/* HEAD (circle) — small sphere, sits in front of the halo.
                Tilts via headRef each frame. */}
            <g ref={headRef}>
              <circle
                cx={SPINE_X}
                cy={HEAD_CY}
                r={HEAD_R}
                fill="url(#head-fill)"
                stroke="var(--color-stage)"
                strokeWidth={0.55}
              />
              {/* Two eye dots and a small mouth — the marionette face */}
              <circle cx={SPINE_X - 4} cy={HEAD_CY - 1} r={0.8} fill="var(--color-stage)" />
              <circle cx={SPINE_X + 4} cy={HEAD_CY - 1} r={0.8} fill="var(--color-stage)" />
              <path
                d={`M ${SPINE_X - 2} ${HEAD_CY + 4} Q ${SPINE_X} ${HEAD_CY + 5.5} ${SPINE_X + 2} ${HEAD_CY + 4}`}
                fill="none"
                stroke="var(--color-stage)"
                strokeWidth={0.5}
              />
            </g>

            {/* COMPOSITE prop — red disc + blue square pair, travels with
                the right hand */}
            <g ref={propRef}>
              <circle
                cx={0}
                cy={0}
                r={5}
                fill="var(--color-accent)"
                fillOpacity={0.55}
                stroke="var(--color-accent-strong)"
                strokeWidth={0.5}
              />
              <rect
                x={3}
                y={3}
                width={7}
                height={7}
                fill="var(--color-secondary)"
                fillOpacity={0.45}
                stroke="var(--color-secondary-strong)"
                strokeWidth={0.5}
              />
            </g>
          </g>
        </svg>
      </div>
    </Stage>
  )
}
