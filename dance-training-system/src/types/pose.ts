export type TrainerMode = 'learn' | 'practice'

export interface PoseKeypoint {
  x: number
  y: number
  z: number
  score: number
}

export interface PoseFrame {
  keypoints: PoseKeypoint[]
  timestampMs: number
}

export interface Choreography {
  id: string
  name: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  source: 'builtin' | 'upload' | 'url'
  thumbnailUrl: string
  poses: PoseFrame[]
  durationMs: number
  createdAt: string
  videoUrl?: string
}

export interface PoseProcessingProgress {
  percent: number
  processedFrames: number
  totalFrames: number
  message: string
}

export interface Detector {
  detectFromVideo(video: HTMLVideoElement): Promise<PoseKeypoint[] | null>
  detectFromImage(image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<PoseKeypoint[] | null>
  close?: () => void
}
