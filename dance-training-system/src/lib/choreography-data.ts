import type { Choreography, PoseFrame } from '@/types/pose'

function seedPose(timestampMs: number, phase: number): PoseFrame {
  const keypoints = Array.from({ length: 33 }, (_, i) => {
    const p = i / 33
    return {
      x: 0.5 + Math.cos(p * Math.PI * 2 + phase) * 0.22,
      y: 0.5 + Math.sin(p * Math.PI * 2 + phase) * 0.27,
      z: Math.sin(phase + p * 4) * 0.08,
      score: 0.9,
    }
  })

  return { keypoints, timestampMs }
}

function createPreset(id: string, name: string, difficulty: Choreography['difficulty'], offset: number): Choreography {
  const poses = Array.from({ length: 18 }, (_, i) => seedPose(i * 350, offset + i * 0.3))

  return {
    id,
    name,
    difficulty,
    source: 'builtin',
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="%23101928"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23e5e7eb" font-size="24">BitDance</text></svg>',
    poses,
    durationMs: poses.length * 350,
    createdAt: '2026-03-04T00:00:00.000Z',
  }
}

export const BUILTIN_CHOREOGRAPHIES: Choreography[] = [
  createPreset('starter-groove', 'Starter Groove', 'Beginner', 0.6),
  createPreset('metro-pop', 'Metro Pop Combo', 'Intermediate', 1.4),
  createPreset('flash-footwork', 'Flash Footwork', 'Advanced', 2.2),
]
