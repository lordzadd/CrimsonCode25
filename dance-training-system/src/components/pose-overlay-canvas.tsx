'use client'

import { useEffect, useRef } from 'react'
import type { PoseFrame } from '@/types/pose'

interface PoseOverlayCanvasProps {
  video: HTMLVideoElement | null
  currentPose: PoseFrame | null
  targetPose: PoseFrame | null
}

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

function drawPose(
  ctx: CanvasRenderingContext2D,
  pose: PoseFrame,
  width: number,
  height: number,
  lineColor: string,
  pointColor: string,
  mirrorX = true
): void {
  const xOf = (x: number) => (mirrorX ? width - x * width : x * width)

  ctx.lineWidth = 2
  ctx.strokeStyle = lineColor
  for (const [a, b] of CONNECTIONS) {
    const p1 = pose.keypoints[a]
    const p2 = pose.keypoints[b]
    if (!p1 || !p2 || p1.score < 0.3 || p2.score < 0.3) {
      continue
    }

    ctx.beginPath()
    ctx.moveTo(xOf(p1.x), p1.y * height)
    ctx.lineTo(xOf(p2.x), p2.y * height)
    ctx.stroke()
  }

  ctx.fillStyle = pointColor
  for (const p of pose.keypoints) {
    if (p.score < 0.3) {
      continue
    }

    ctx.beginPath()
    ctx.arc(xOf(p.x), p.y * height, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function PoseOverlayCanvas({ video, currentPose, targetPose }: PoseOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) {
      return
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (targetPose) {
      drawPose(ctx, targetPose, canvas.width, canvas.height, 'rgba(34,211,238,0.55)', 'rgba(103,232,249,0.72)')
    }

    if (currentPose) {
      drawPose(ctx, currentPose, canvas.width, canvas.height, 'rgba(16,185,129,0.95)', 'rgba(16,185,129,1)')
    }
  }, [currentPose, targetPose, video])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
}
