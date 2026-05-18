/**
 * Move playback engine.
 *
 * Computes the scene's shape state at a given time t (ms) by walking through
 * the move's clips. For each shape, find the most recent clip that affects
 * it and started by time t. The shape's state is either:
 *   - Mid-tween (t between clip.startMs and clip.startMs+durationMs): lerp
 *     between the shape's state at clip start and the clip's target state.
 *   - Held (t past clip end): hold the target state.
 *   - Unchanged (no clip yet): hold the starting-pose state.
 *
 * To compute "shape's state at clip start," we recursively look at the
 * previous clip for the same shape (or fall back to the starting pose).
 * Memoized to avoid quadratic cost when many clips chain.
 */

import type { Move, MoveClip, Pose, Scene, Shape } from './types'
import { applyEasing, tweenShape } from './tween'

type ComputeContext = {
  move: Move
  startPose: Pose
  poses: Pose[]
}

/** Compute the scene's shapes at time `tMs` for the given move.
 *  Returns the rendered shape list (top-level shape ids), not a full scene. */
export function computeMoveSnapshot(
  scene: Scene,
  move: Move,
  startPose: Pose,
  poses: Pose[],
  tMs: number,
): Scene {
  // Memoize per-shape state computation.
  const stateCache = new Map<string, Shape>()
  const ctx: ComputeContext = { move, startPose, poses }

  const computedShapes = scene.shapes.map((shape) =>
    computeShapeStateAtTime(shape, tMs, ctx, stateCache),
  )

  return { ...scene, shapes: computedShapes }
}

/** Compute one shape's state at time `tMs`. Recursively considers earlier
 *  clips on the same shape to build up the state chain. */
function computeShapeStateAtTime(
  shape: Shape,
  tMs: number,
  ctx: ComputeContext,
  cache: Map<string, Shape>,
): Shape {
  const cacheKey = `${shape.id}::${tMs.toFixed(2)}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  // Find all clips that target this shape, sorted by start time.
  const clipsForShape = ctx.move.clips
    .filter((c) => c.shapeId === shape.id && c.startMs <= tMs)
    .sort((a, b) => a.startMs - b.startMs)

  let currentState = findShapeInPose(shape.id, ctx.startPose) ?? shape

  for (const clip of clipsForShape) {
    const target = resolveClipTarget(clip, ctx)
    if (!target) continue

    const elapsed = tMs - clip.startMs
    if (elapsed >= clip.durationMs) {
      // Clip is fully complete; jump to target.
      currentState = applyShapeIdentity(currentState, target)
    } else {
      // Mid-tween: interpolate from currentState to target at progress
      // elapsed/durationMs, with easing.
      const rawT = elapsed / clip.durationMs
      const t = applyEasing(rawT, clip.easing)
      currentState = tweenShape(currentState, applyShapeIdentity(currentState, target), t)
    }
  }

  // If the shape is a composite, recursively compute each child's state too
  // (since clips may target individual children).
  if (currentState.kind === 'composite') {
    const computedChildren = currentState.children.map((child) =>
      computeShapeStateAtTime(child, tMs, ctx, cache),
    )
    currentState = { ...currentState, children: computedChildren }
  }

  cache.set(cacheKey, currentState)
  return currentState
}

/** Resolve a clip's target by looking up the referenced pose and extracting
 *  the shape with the matching id. */
function resolveClipTarget(clip: MoveClip, ctx: ComputeContext): Shape | null {
  const pose = ctx.poses.find((p) => p.id === clip.targetPoseId)
  if (!pose) return null
  return findShapeInPose(clip.shapeId, pose)
}

/** Find a shape by id anywhere in a pose's shape tree. */
function findShapeInPose(shapeId: string, pose: Pose): Shape | null {
  return findShapeById(pose.shapes, shapeId)
}

function findShapeById(shapes: Shape[], id: string): Shape | null {
  for (const shape of shapes) {
    if (shape.id === id) return shape
    if (shape.kind === 'composite') {
      const inChildren = findShapeById(shape.children, id)
      if (inChildren) return inChildren
    }
  }
  return null
}

/** Apply the target's geometry to the current shape's identity. We want to
 *  preserve the current shape's id, label, and style (which can't be tweened
 *  generically) while taking the target's vertex/center/angle data. This\n *  matters when poses are stored with their own ids but the live scene shape\n *  needs to stay consistent. */
function applyShapeIdentity(current: Shape, target: Shape): Shape {
  if (current.kind !== target.kind) return target
  // Keep current's id, label, style; take target's geometry.
  return {
    ...target,
    id: current.id,
    label: current.label,
    // @ts-expect-error - all non-composite shapes have style
    style: 'style' in current ? current.style : target.style,
  }
}
