import type { Detector, PoseKeypoint } from '@/types/pose'

const KEYPOINT_COUNT = 33

function createBaselinePose(t: number): PoseKeypoint[] {
  const sway = Math.sin(t) * 0.06
  const lift = Math.cos(t * 1.7) * 0.05

  return Array.from({ length: KEYPOINT_COUNT }, (_, i) => {
    const ring = i / KEYPOINT_COUNT
    return {
      x: 0.5 + Math.cos(ring * Math.PI * 2) * 0.2 + sway,
      y: 0.45 + Math.sin(ring * Math.PI * 2) * 0.3 + lift,
      z: Math.sin((ring + t) * Math.PI * 2) * 0.1,
      score: 0.65 + 0.35 * Math.abs(Math.cos(t + ring)),
    }
  })
}

export class MockPoseDetector implements Detector {
  async detectFromVideo(video: HTMLVideoElement): Promise<PoseKeypoint[] | null> {
    const t = video.currentTime
    return createBaselinePose(t)
  }

  async detectFromImage(): Promise<PoseKeypoint[] | null> {
    const t = performance.now() / 1000
    return createBaselinePose(t)
  }

  close(): void {
    return
  }
}
