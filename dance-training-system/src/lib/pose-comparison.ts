import type { PoseFrame, PoseKeypoint } from '@/types/pose'
import { normalizePoseByShoulderWidth } from '@/lib/pose-processor'

const IMPORTANT_WEIGHTS: Record<number, number> = {
  13: 1.25,
  14: 1.25,
  15: 1.4,
  16: 1.4,
  25: 1.3,
  26: 1.3,
  27: 1.45,
  28: 1.45,
  11: 1.1,
  12: 1.1,
  23: 1.1,
  24: 1.1,
}

const VISIBILITY_THRESHOLD = 0.3

function pointDistance(a: PoseKeypoint, b: PoseKeypoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function calculateSimilarity(current: PoseFrame, target: PoseFrame): number {
  const normalizedCurrent = normalizePoseByShoulderWidth(current.keypoints)
  const normalizedTarget = normalizePoseByShoulderWidth(target.keypoints)

  let weightedDistance = 0
  let totalWeight = 0

  for (let i = 0; i < normalizedCurrent.length; i += 1) {
    const cur = normalizedCurrent[i]
    const ref = normalizedTarget[i]

    if (!cur || !ref || cur.score <= VISIBILITY_THRESHOLD || ref.score <= VISIBILITY_THRESHOLD) {
      continue
    }

    const weight = IMPORTANT_WEIGHTS[i] ?? 1
    weightedDistance += pointDistance(cur, ref) * weight
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return 0
  }

  const normalizedDistance = weightedDistance / totalWeight
  const similarity = Math.max(0, 100 - normalizedDistance * 150)
  return Math.min(100, similarity)
}
