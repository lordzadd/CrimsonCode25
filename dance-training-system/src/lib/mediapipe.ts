import type { Detector, PoseKeypoint } from '@/types/pose'
import { MockPoseDetector } from '@/lib/mediapipe-mock'

interface MediaPipeLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

interface MediaPipeResults {
  poseLandmarks?: MediaPipeLandmark[]
}

function toKeypoints(landmarks: MediaPipeLandmark[]): PoseKeypoint[] {
  return landmarks.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    score: point.visibility ?? 0.8,
  }))
}

export async function createPoseDetector(): Promise<Detector> {
  if (process.env.NODE_ENV !== 'production') {
    return new MockPoseDetector()
  }

  try {
    const poseModule = await import('@mediapipe/pose')
    const PoseCtor = poseModule.Pose

    const pose = new PoseCtor({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    let resolver: ((value: PoseKeypoint[] | null) => void) | null = null

    pose.onResults((results: MediaPipeResults) => {
      if (!resolver) {
        return
      }

      const landmarks = results.poseLandmarks
      resolver(landmarks ? toKeypoints(landmarks) : null)
      resolver = null
    })

    return {
      async detectFromVideo(video: HTMLVideoElement) {
        return new Promise<PoseKeypoint[] | null>((resolve) => {
          resolver = resolve
          pose.send({ image: video })
        })
      },
      async detectFromImage(image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
        return new Promise<PoseKeypoint[] | null>((resolve) => {
          resolver = resolve
          pose.send({ image })
        })
      },
      close() {
        pose.close()
      },
    }
  } catch {
    return new MockPoseDetector()
  }
}
