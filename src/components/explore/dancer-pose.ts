/**
 * The Bauhaus dancer's pose — the specific shape configuration she's frozen in.
 *
 * This file holds the *pose* (geometry only); the rendering chrome (Stage,
 * spotlight, breathing animation, gradients, filters, ink stroke) lives in
 * `Dancer.tsx`. Splitting it this way means future poses can be swapped in
 * by editing this file alone, without touching the render code.
 *
 * The pose was authored in the pose editor (/pose-editor) and exported from
 * its localStorage. Coordinates are in the same SVG viewBox (360x460) the
 * dancer has always used.
 */

export type Point = { x: number; y: number }

export type ArmComposite = {
  /** Hand: a circle. */
  circle: { center: Point; radius: number }
  /** Forearm: a quadrilateral (4 corners). The pose editor allows non-
   *  rectangular squares, so we store all 4 vertices rather than (x,y,w,h). */
  square: { vertices: [Point, Point, Point, Point] }
}

export type SkirtArc = {
  center: Point
  radius: number
  /** Degrees, SVG convention (0° = right, CW positive). */
  startAngle: number
  endAngle: number
}

export type DancerPose = {
  head: { center: Point; radius: number }
  torso: { vertices: [Point, Point, Point, Point] }
  leftLeg: { vertices: [Point, Point, Point] }
  rightLeg: { vertices: [Point, Point, Point] }
  leftArm: ArmComposite
  rightArm: ArmComposite
  skirtArcs: SkirtArc[]
}

/** A pose authored in /pose-editor. Mid-stride, asymmetric arms — she's in
 *  motion rather than at rest. */
export const DANCER_POSE: DancerPose = {
  head: {
    center: { x: 180.226, y: 75.334 },
    radius: 50.196,
  },
  torso: {
    vertices: [
      { x: 132, y: 126 },
      { x: 228, y: 126 },
      { x: 228, y: 222 },
      { x: 132, y: 222 },
    ],
  },
  leftLeg: {
    vertices: [
      { x: 118.142, y: 270.205 },
      { x: 179.042, y: 292.713 },
      { x: 162.41, y: 374.038 },
    ],
  },
  rightLeg: {
    vertices: [
      { x: 175.594, y: 288.886 },
      { x: 241.355, y: 290.627 },
      { x: 192.981, y: 357.343 },
    ],
  },
  leftArm: {
    circle: {
      center: { x: 116.167, y: 154.8 },
      radius: 22.479,
    },
    square: {
      vertices: [
        { x: 59.988, y: 157.317 },
        { x: 101.885, y: 165.568 },
        { x: 105.85, y: 203.102 },
        { x: 59.712, y: 204.493 },
      ],
    },
  },
  rightArm: {
    circle: {
      center: { x: 245.5, y: 154.8 },
      radius: 17.5,
    },
    square: {
      vertices: [
        { x: 258.958, y: 112.859 },
        { x: 293.958, y: 112.859 },
        { x: 293.958, y: 147.859 },
        { x: 258.958, y: 147.859 },
      ],
    },
  },
  /** Four arcs forming the skirt. Each arc was repositioned in the pose
   *  editor to suit the mid-stride body — slightly asymmetric, no longer
   *  the symmetric "( ) ( )" bracket arrangement of the canonical pose. */
  skirtArcs: [
    {
      center: { x: 135.304, y: 240.174 },
      radius: 31.415,
      startAngle: 73.079,
      endAngle: 267.078,
    },
    {
      center: { x: 168.007, y: 251.578 },
      radius: 32.105,
      startAngle: 248.895,
      endAngle: 90.565,
    },
    {
      center: { x: 200.878, y: 252.479 },
      radius: 38.036,
      startAngle: 475.268,
      endAngle: 292.580,
    },
    {
      center: { x: 227.125, y: 252.782 },
      radius: 41.290,
      startAngle: -80.084,
      endAngle: 89.126,
    },
  ],
}
