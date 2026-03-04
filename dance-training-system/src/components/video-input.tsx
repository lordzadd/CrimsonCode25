'use client'

import { useEffect, useRef } from 'react'

interface VideoInputProps {
  onReady: (video: HTMLVideoElement) => void
  mirror?: boolean
}

export function VideoInput({ onReady, mirror = true }: VideoInputProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    const start = async () => {
      if (!videoRef.current) {
        return
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      onReady(videoRef.current)
    }

    start().catch(() => {
      return
    })

    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onReady])

  return (
    <video
      ref={videoRef}
      className={`h-full w-full rounded-xl object-cover ${mirror ? '-scale-x-100' : ''}`}
      playsInline
      muted
    />
  )
}
