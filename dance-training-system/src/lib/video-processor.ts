import { filterSimilarPoses } from '@/lib/pose-processor'
import type { Choreography, Detector, PoseFrame, PoseProcessingProgress } from '@/types/pose'

const TARGET_FPS = 3
const MAX_FRAMES = 30

export interface ProcessVideoOptions {
  name: string
  source: 'upload' | 'url'
  difficulty: Choreography['difficulty']
  detector: Detector
  file?: File
  videoUrl?: string
  onProgress?: (progress: PoseProcessingProgress) => void
}

function waitForEvent<T extends keyof HTMLMediaElementEventMap>(
  element: HTMLVideoElement,
  event: T
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      element.removeEventListener('error', onError)
      resolve()
    }

    const onError = () => {
      element.removeEventListener(event, onLoaded)
      reject(new Error('Unable to process the selected video.'))
    }

    element.addEventListener(event, onLoaded, { once: true })
    element.addEventListener('error', onError, { once: true })
  })
}

function seek(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('error', onError)
      resolve()
    }

    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      reject(new Error('Failed while seeking video frame.'))
    }

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.currentTime = timeSeconds
  })
}

export async function processVideoToChoreography(options: ProcessVideoOptions): Promise<Choreography> {
  const video = document.createElement('video')
  const objectUrl = options.file ? URL.createObjectURL(options.file) : undefined

  video.crossOrigin = 'anonymous'
  video.preload = 'metadata'
  video.src = options.videoUrl ?? objectUrl ?? ''
  video.muted = true
  video.playsInline = true

  await waitForEvent(video, 'loadedmetadata')

  const duration = Math.max(video.duration, 0.1)
  const frameCount = Math.min(MAX_FRAMES, Math.max(1, Math.ceil(duration * TARGET_FPS)))
  const frames: PoseFrame[] = []

  for (let i = 0; i < frameCount; i += 1) {
    const progress = ((i + 1) / frameCount) * 100
    const captureTime = Math.min(duration - 0.001, i / TARGET_FPS)

    await seek(video, captureTime)
    const keypoints = await options.detector.detectFromVideo(video)

    if (keypoints) {
      frames.push({ keypoints, timestampMs: captureTime * 1000 })
    }

    options.onProgress?.({
      percent: progress,
      processedFrames: i + 1,
      totalFrames: frameCount,
      message: `Processing frame ${i + 1}/${frameCount}`,
    })
  }

  const filteredFrames = filterSimilarPoses(frames, 90)
  if (filteredFrames.length === 0) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
    throw new Error('No visible poses were detected in this video.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 360
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  }

  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }

  const id = `${options.source}-${Date.now()}`

  return {
    id,
    name: options.name,
    difficulty: options.difficulty,
    source: options.source,
    thumbnailUrl,
    poses: filteredFrames,
    durationMs: duration * 1000,
    createdAt: new Date().toISOString(),
    videoUrl: options.videoUrl,
  }
}
