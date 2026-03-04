import type { PoseFrame, PoseKeypoint } from '@/types/pose'
import { calculateSimilarity } from '@/lib/pose-comparison'

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12

function shoulderWidth(points: PoseKeypoint[]): number {
  const left = points[LEFT_SHOULDER]
  const right = points[RIGHT_SHOULDER]

  if (!left || !right) {
    return 1
  }

  const dx = left.x - right.x
  const dy = left.y - right.y
  const width = Math.sqrt(dx * dx + dy * dy)
  return width > 0.0001 ? width : 1
}

function midpoint(a: PoseKeypoint, b: PoseKeypoint): PoseKeypoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    score: Math.min(a.score, b.score),
  }
}

export function normalizePoseByShoulderWidth(points: PoseKeypoint[]): PoseKeypoint[] {
  const left = points[LEFT_SHOULDER]
  const right = points[RIGHT_SHOULDER]

  if (!left || !right) {
    return points
  }

  const center = midpoint(left, right)
  const scale = shoulderWidth(points)

  return points.map((point) => ({
    x: (point.x - center.x) / scale,
    y: (point.y - center.y) / scale,
    z: point.z / scale,
    score: point.score,
  }))
}

export function filterSimilarPoses(frames: PoseFrame[], threshold = 90): PoseFrame[] {
  if (frames.length <= 1) {
    return frames
  }

  const filtered: PoseFrame[] = [frames[0]]

  for (let i = 1; i < frames.length; i += 1) {
    const similarity = calculateSimilarity(frames[i], filtered[filtered.length - 1])
    if (similarity < threshold) {
      filtered.push(frames[i])
    }
  }

  return filtered
}
