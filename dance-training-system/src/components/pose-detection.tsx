'use client'

import { useEffect, useRef, useState } from 'react'
import { createPoseDetector } from '@/lib/mediapipe'
import type { Detector, PoseFrame } from '@/types/pose'

interface PoseDetectionProps {
  video: HTMLVideoElement | null
  enabled: boolean
  onPose: (pose: PoseFrame) => void
}

export function PoseDetection({ video, enabled, onPose }: PoseDetectionProps) {
  const detectorRef = useRef<Detector | null>(null)
  const rafRef = useRef<number | null>(null)
  const [status, setStatus] = useState('initializing')

  useEffect(() => {
    let mounted = true

    createPoseDetector()
      .then((detector) => {
        if (!mounted) {
          detector.close?.()
          return
        }

        detectorRef.current = detector
        setStatus('ready')
      })
      .catch(() => setStatus('fallback'))

    return () => {
      mounted = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      detectorRef.current?.close?.()
    }
  }, [])

  useEffect(() => {
    if (!enabled || !video || !detectorRef.current) {
      return
    }

    let active = true

    const tick = async () => {
      if (!active || !detectorRef.current) {
        return
      }

      const keypoints = await detectorRef.current.detectFromVideo(video)
      if (keypoints) {
        onPose({ keypoints, timestampMs: performance.now() })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      active = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [enabled, video, onPose])

  return <p className="text-xs text-zinc-400">Detector: {status}</p>
}
