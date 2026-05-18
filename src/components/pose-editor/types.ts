/**
 * Shape-first data model for the pose editor.
 *
 * The dancer is a `Scene` of geometric primitives. The dancer's identity is
 * the *arrangement* of these primitives, not their roles ("head", "arm"). Roles
 * are metadata — useful for selection lists and saved poses — but the geometry
 * doesn't know about them.
 *
 * Editing a pose means changing the shapes' vertices, centers, radii, etc.
 * Save = snapshot the whole scene. Load = replace current scene with a snapshot.
 *
 * Phase-by-phase usage:
 *  - Phase 1: render shapes from this model. No editing yet.
 *  - Phase 2: track selection in component state (not in the model).
 *  - Phase 3: draggable vertex handles update shape state in-place.
 *  - Phase 5: composite shapes get drill-in selection.
 */

export type Point = { x: number; y: number }

/** Base properties common to most shapes. Composites don't have fill/stroke directly;
 *  their children do. */
type BaseShape = {
  /** Stable identifier for selection and saved-pose lookup. */
  id: string
  /** Human-readable label shown in the selection panel. Doesn't affect geometry. */
  label: string
}

/** Visual style for shapes that have a fill + stroke. */
export type ShapeStyle = {
  /** CSS color value (var(--color-...), hex, rgb()). */
  fill?: string
  stroke?: string
  /** Stroke width in SVG units. */
  strokeWidth?: number
  /** Optional SVG filter id to apply (e.g. the dancer's "edge" filter). */
  filterId?: string
}

export type CircleShape = BaseShape & {
  kind: 'circle'
  center: Point
  radius: number
  style: ShapeStyle
  /** Pivot point for rotation. Defaults to center if not set. (Circles are
   *  rotationally symmetric so the circle itself doesn't visibly change, but
   *  the editor's radius handle does rotate around this point.) */
  anchor?: Point
}

/** Square = a polygon with exactly 4 corners. We store all 4 corners explicitly
 *  rather than (x, y, width, height) so the user can drag any corner independently
 *  and the shape can deform into a quadrilateral. */
export type SquareShape = BaseShape & {
  kind: 'square'
  vertices: [Point, Point, Point, Point]
  style: ShapeStyle
  /** Pivot point for rotation. Defaults to the centroid of the four vertices
   *  if not set. */
  anchor?: Point
}

/** Triangle = a polygon with exactly 3 corners. Drag any vertex to deform. */
export type TriangleShape = BaseShape & {
  kind: 'triangle'
  vertices: [Point, Point, Point]
  style: ShapeStyle
  /** Pivot point for rotation. Defaults to the centroid of the three vertices
   *  if not set. For body-part triangles like legs, set this to the joint
   *  position (e.g. the midpoint of the top edge) so rotation pivots
   *  naturally around the hip. */
  anchor?: Point
}

/** Arc = a section of a circle defined by center, radius, and two angles (degrees).
 *  Rendered as an SVG <path> with the appropriate "A" command. Angles measured
 *  in degrees, 0° pointing right, increasing clockwise (SVG convention). */
export type ArcShape = BaseShape & {
  kind: 'arc'
  center: Point
  radius: number
  startAngle: number
  endAngle: number
  style: ShapeStyle
  /** Pivot point for rotation. Defaults to center if not set. */
  anchor?: Point
}

/** Composite = a group of child shapes treated as a unit. Rendered with an optional
 *  group transform (translate / rotate / scale around an anchor). The children's
 *  coordinates are in the composite's *local* space; the transform maps that to
 *  world space.
 *
 *  Selection-wise (later phases), clicking a composite selects the composite as
 *  a whole. Drilling in (double-click or panel) selects individual children. */
export type CompositeShape = BaseShape & {
  kind: 'composite'
  /** Anchor point for rotation/scaling, in world coords (NOT local). */
  anchor: Point
  /** Rotation in degrees. */
  rotation?: number
  /** Uniform scale. Negative x scale = horizontal flip (used for the left arm). */
  scale?: { x: number; y: number }
  /** Children in render order (first drawn = furthest back within this composite). */
  children: Shape[]
}

export type Shape =
  | CircleShape
  | SquareShape
  | TriangleShape
  | ArcShape
  | CompositeShape

/** Top-level scene: an ordered list of shapes. Order = render order (first = back). */
export type Scene = {
  /** Identifier for saved poses to reference. */
  id: string
  /** Display name. */
  name: string
  /** SVG viewBox dimensions. */
  width: number
  height: number
  /** Shapes in render order (first drawn = furthest back). */
  shapes: Shape[]
}

/** A saved pose: a snapshot of the scene shapes (geometry only, not viewBox or id). */
export type Pose = {
  id: string
  name: string
  shapes: Shape[]
  /** When this pose was created, ms since epoch. */
  createdAt: number
}

// ---------------------------------------------------------------------------
// Moves — timeline-based animation
// ---------------------------------------------------------------------------

/** A clip is a single per-shape animation event. It says: "the shape with
 *  this id should tween from its current state to the target state (read
 *  from `targetPoseId`'s snapshot) starting at `startMs` and taking
 *  `durationMs`."
 *
 *  Clips are per-shape so different parts of the dancer can animate on
 *  independent rhythms (left leg starts now, right leg starts in 400ms,
 *  arms swing oppositely, etc).
 */
export type MoveClip = {
  id: string
  /** Which shape on the dancer this clip drives. References `Shape.id`. */
  shapeId: string
  /** Which saved pose to read the target shape state from. The pose's `shapes`
   *  array is searched for a shape with matching id; that shape's state is
   *  the tween target. */
  targetPoseId: string
  /** Clip start time relative to the start of the move (ms). */
  startMs: number
  /** Tween duration (ms). After this, the shape holds at the target state. */
  durationMs: number
  /** Tween shape. 'snap' is instant (durationMs is ignored). */
  easing: 'linear' | 'ease-in-out' | 'snap'
}

/** A move is a named timeline of clips, played starting from an initial pose. */
export type Move = {
  id: string
  name: string
  /** Initial scene state at t=0 (full-body pose). */
  startPoseId: string
  clips: MoveClip[]
  /** Total move duration (ms). Clips beyond this are simply not played
   *  past durationMs; clips that extend past durationMs are clamped. */
  durationMs: number
  loop: boolean
  createdAt: number
}
