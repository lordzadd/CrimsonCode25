import type { PoseFrame, PoseKeypoint } from '@/types/pose'
import { calculateSimilarity } from '@/lib/pose-comparison'
import { filterSimilarPoses, normalizePoseByShoulderWidth } from '@/lib/pose-processor'

export interface SavedPoseSequence {
  name: string
  poses: PoseFrame[]
  metadata: {
    created: string
    fps?: number
  }
}

export { calculateSimilarity, filterSimilarPoses, normalizePoseByShoulderWidth }

export function savePoseSequence(sequence: SavedPoseSequence): void {
  const blob = new Blob([JSON.stringify(sequence)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sequence.name.replace(/\s+/g, '_')}_poses.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function loadPoseSequence(file: File): Promise<SavedPoseSequence> {
  const text = await file.text()
  const parsed = JSON.parse(text) as SavedPoseSequence
  return parsed
}

export function convertKeypointsToFrame(keypoints: PoseKeypoint[], timestampMs: number): PoseFrame {
  return { keypoints, timestampMs }
}
