'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

type Permission = 'idle' | 'requesting' | 'granted' | 'denied'

type Detection = {
  bbox: { x: number; y: number; width: number; height: number }
  score: number
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'

type DetectorHandle = {
  detectForVideo: (video: HTMLVideoElement, ts: number) => { detections?: Array<unknown> }
  close?: () => void
}

// The webcam panel that sits beside figures 3 and 5. It exists as a real-but-modest
// example app the user can imagine modifying with Claude Code — MediaPipe face
// detection running in-browser, nothing leaving the user's machine. Earlier
// versions also accepted uploaded still images as a fallback for camera-denied
// users; that path was removed because the lesson is the figures, not the demo,
// and the upload affordance was attracting attention out of proportion to its
// role.
export function WebcamPlayground({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<DetectorHandle | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const [permission, setPermission] = useState<Permission>('idle')
  const [error, setError] = useState<string | null>(null)
  const [detectorReady, setDetectorReady] = useState(false)
  const [detections, setDetections] = useState<Detection[]>([])

  // Lazy-load MediaPipe detector on mount.
  useEffect(() => {
    let cancelled = false
    async function setup() {
      try {
        const tasks = await import('@mediapipe/tasks-vision')
        const fileset = await tasks.FilesetResolver.forVisionTasks(WASM_BASE)
        const detector = (await tasks.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
        })) as unknown as DetectorHandle
        if (cancelled) {
          detector.close?.()
          return
        }
        detectorRef.current = detector
        setDetectorReady(true)
      } catch (err) {
        if (!cancelled) setError(`Couldn’t load face detector: ${(err as Error).message}`)
      }
    }
    setup()
    return () => {
      cancelled = true
      stopWebcamInternal()
      detectorRef.current?.close?.()
      detectorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopWebcamInternal = () => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const loop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const detector = detectorRef.current
    if (!video || !canvas || !detector || streamRef.current == null) return

    if (video.readyState >= 2) {
      try {
        const result = detector.detectForVideo(video, performance.now())
        const dets = readDetections(result?.detections ?? [])
        setDetections(dets)
        drawOverlay(canvas, video.videoWidth, video.videoHeight, dets)
      } catch (err) {
        console.error(err)
      }
    }
    animationRef.current = requestAnimationFrame(loop)
  }, [])

  const startWebcam = async () => {
    if (!detectorRef.current) return
    setError(null)
    setPermission('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setPermission('granted')
      loop()
    } catch {
      setPermission('denied')
      setError(
        'Camera access was blocked or unavailable. The figures still work without it — the webcam is just a small example to practice on.',
      )
    }
  }

  const stopWebcam = () => {
    stopWebcamInternal()
    setPermission('idle')
    setDetections([])
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  const showWebcamMedia = permission === 'granted'

  return (
    <div
      className={cn(
        'border-border-subtle bg-surface relative flex flex-col gap-3 overflow-hidden rounded-lg border',
        className,
      )}
    >
      <div className="bg-[color:var(--color-stage)] relative aspect-video w-full overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'absolute inset-0 size-full object-cover',
            !showWebcamMedia && 'hidden',
          )}
        />
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {!showWebcamMedia && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            {detectorReady ? (
              <>
                <p className="font-script text-2xl tracking-wide">the webcam</p>
                <p className="text-xs italic opacity-70">
                  face detection · MediaPipe Tasks · in your browser
                </p>
              </>
            ) : error ? null : (
              <div className="flex items-center gap-2 text-xs opacity-70">
                <Loader2 className="size-4 animate-spin" />
                Loading detector…
              </div>
            )}
          </div>
        )}

        {detections.length > 0 && (
          <div className="bg-[color:var(--color-stage)]/70 absolute right-2 top-2 rounded px-2 py-1 font-mono text-xs text-white">
            {detections.length} face{detections.length === 1 ? '' : 's'} · top score{' '}
            {Math.max(...detections.map((d) => d.score)).toFixed(2)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3">
        {permission !== 'granted' ? (
          <Button
            variant="primary"
            onClick={startWebcam}
            disabled={!detectorReady || permission === 'requesting'}
          >
            {permission === 'requesting' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {permission === 'requesting' ? 'Asking…' : 'Start webcam'}
          </Button>
        ) : (
          <Button onClick={stopWebcam}>
            <CameraOff className="size-4" />
            Stop
          </Button>
        )}

        <span className="text-text-tertiary ml-auto text-xs italic">
          Nothing leaves your browser.
        </span>
      </div>

      {error && (
        <div className="border-border-soft text-text-secondary mx-3 mb-3 rounded border px-3 py-2 text-xs">
          {error}
        </div>
      )}
    </div>
  )
}

function readDetections(raw: unknown[]): Detection[] {
  return raw
    .map((r) => {
      const obj = r as {
        boundingBox?: { originX: number; originY: number; width: number; height: number }
        categories?: Array<{ score?: number }>
      }
      if (!obj.boundingBox) return null
      return {
        bbox: {
          x: obj.boundingBox.originX,
          y: obj.boundingBox.originY,
          width: obj.boundingBox.width,
          height: obj.boundingBox.height,
        },
        score: obj.categories?.[0]?.score ?? 0,
      }
    })
    .filter((d): d is Detection => d != null)
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
  detections: Detection[],
) {
  if (!sourceWidth || !sourceHeight) return
  // Match canvas pixel size to source resolution; CSS handles the scaling.
  if (canvas.width !== sourceWidth) canvas.width = sourceWidth
  if (canvas.height !== sourceHeight) canvas.height = sourceHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = Math.max(2, Math.round(sourceWidth / 240))
  ctx.strokeStyle = 'rgb(200, 40, 30)' // Bauhaus red
  ctx.fillStyle = 'rgb(200, 40, 30)'
  ctx.font = `${Math.max(12, Math.round(sourceWidth / 60))}px ui-monospace, Menlo, monospace`
  for (const d of detections) {
    ctx.strokeRect(d.bbox.x, d.bbox.y, d.bbox.width, d.bbox.height)
    const label = d.score.toFixed(2)
    const padding = 4
    const textWidth = ctx.measureText(label).width
    const textHeight = parseInt(ctx.font, 10)
    ctx.fillRect(d.bbox.x, d.bbox.y - textHeight - padding * 2, textWidth + padding * 2, textHeight + padding * 2)
    ctx.fillStyle = 'white'
    ctx.fillText(label, d.bbox.x + padding, d.bbox.y - padding)
    ctx.fillStyle = 'rgb(200, 40, 30)'
  }
}
