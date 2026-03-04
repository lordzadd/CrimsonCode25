'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChoreographySelector } from '@/components/choreography-selector'
import { PoseDetection } from '@/components/pose-detection'
import { VideoInput } from '@/components/video-input'
import { VrmAvatar } from '@/components/vrm-avatar'
import { BUILTIN_CHOREOGRAPHIES } from '@/lib/choreography-data'
import { loadCustomChoreographies, saveCustomChoreographies } from '@/lib/choreography-storage'
import { calculateSimilarity } from '@/lib/pose-comparison'
import type { Choreography, PoseFrame, TrainerMode } from '@/types/pose'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ADVANCE_THRESHOLD = 78

export function DanceTrainer() {
  const [customChoreographies, setCustomChoreographies] = useState<Choreography[]>([])
  const [selected, setSelected] = useState<Choreography>(BUILTIN_CHOREOGRAPHIES[0])
  const [mode, setMode] = useState<TrainerMode>('learn')
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [currentPose, setCurrentPose] = useState<PoseFrame | null>(null)
  const [index, setIndex] = useState(0)

  const all = useMemo(() => [...BUILTIN_CHOREOGRAPHIES, ...customChoreographies], [customChoreographies])
  const targetPose = selected.poses[index] ?? null
  const similarity = currentPose && targetPose ? calculateSimilarity(currentPose, targetPose) : 0

  useEffect(() => {
    const stored = loadCustomChoreographies()
    if (stored.length > 0) {
      setCustomChoreographies(stored)
    }
  }, [])

  useEffect(() => {
    saveCustomChoreographies(customChoreographies)
  }, [customChoreographies])

  useEffect(() => {
    if (mode !== 'practice' || similarity < ADVANCE_THRESHOLD || index >= selected.poses.length - 1) {
      return
    }

    const timer = window.setTimeout(() => {
      setIndex((prev) => Math.min(prev + 1, selected.poses.length - 1))
    }, 180)

    return () => window.clearTimeout(timer)
  }, [index, mode, selected.poses.length, similarity])

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 text-zinc-100">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle>BitDance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChoreographySelector
            choreographies={customChoreographies}
            onChoose={(item) => {
              setSelected(item)
              setIndex(0)
            }}
            onAdd={(item) => setCustomChoreographies((prev) => [item, ...prev])}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant={mode === 'learn' ? 'default' : 'outline'} onClick={() => setMode('learn')}>
          Learn Mode
        </Button>
        <Button variant={mode === 'practice' ? 'default' : 'outline'} onClick={() => setMode('practice')}>
          Practice Mode
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle>Reference ({selected.name})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] overflow-hidden rounded-lg border border-zinc-800">
              <VrmAvatar pose={targetPose} wireframe={mode === 'learn'} opacity={0.88} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
              <VideoInput onReady={setVideoEl} />
            </div>
            <PoseDetection video={videoEl} enabled={mode === 'practice'} onPose={setCurrentPose} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardContent className="space-y-3 pt-6">
          <div className="text-sm text-zinc-300">
            Step {index + 1}/{selected.poses.length} | Similarity {similarity.toFixed(1)}%
          </div>
          <div className="h-3 rounded bg-zinc-800">
            <div className="h-3 rounded bg-cyan-500" style={{ width: `${similarity}%` }} />
          </div>
          <div className="h-2 rounded bg-zinc-800">
            <div
              className="h-2 rounded bg-emerald-500"
              style={{ width: `${((index + 1) / Math.max(selected.poses.length, 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">
            {similarity >= ADVANCE_THRESHOLD
              ? 'Great match. Auto-advancing to next pose.'
              : 'Align your limbs with the reference avatar to progress.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}>
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setIndex((prev) => Math.min(prev + 1, selected.poses.length - 1))}
            >
              Next
            </Button>
            <Button
              onClick={() => {
                const next = all[(all.findIndex((item) => item.id === selected.id) + 1) % all.length]
                setSelected(next)
                setIndex(0)
              }}
            >
              Next Choreography
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
