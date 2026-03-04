'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChoreographySelector } from '@/components/choreography-selector'
import { PoseDetection } from '@/components/pose-detection'
import { PoseOverlayCanvas } from '@/components/pose-overlay-canvas'
import { VideoInput } from '@/components/video-input'
import { VrmAvatar } from '@/components/vrm-avatar'
import { BUILTIN_CHOREOGRAPHIES } from '@/lib/choreography-data'
import { loadCustomChoreographies, saveCustomChoreographies } from '@/lib/choreography-storage'
import {
  getSelectedAvatarId,
  listAvatarOptions,
  resolveAvatarUrl,
  saveAvatarFile,
  saveAvatarUrl,
  setSelectedAvatarId,
  type AvatarOption,
} from '@/lib/avatar-storage'
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
  const [cameraError, setCameraError] = useState('')

  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([])
  const [selectedAvatarId, setSelectedAvatar] = useState<string>('default')
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | undefined>(undefined)
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarMessage, setAvatarMessage] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const blobUrlRef = useRef<string | null>(null)

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

  useEffect(() => {
    let mounted = true

    const loadAvatars = async () => {
      const options = await listAvatarOptions()
      if (!mounted) {
        return
      }

      const selectedId = getSelectedAvatarId()
      setAvatarOptions(options)
      setSelectedAvatar(selectedId)
    }

    void loadAvatars()

    return () => {
      mounted = false
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    const hydrateAvatar = async () => {
      if (selectedAvatarId === 'default') {
        setSelectedAvatarUrl(undefined)
        return
      }

      const option = avatarOptions.find((item) => item.id === selectedAvatarId)
      if (!option) {
        setSelectedAvatarUrl(undefined)
        return
      }

      const resolved = await resolveAvatarUrl(option)
      if (!active) {
        if (resolved?.startsWith('blob:')) {
          URL.revokeObjectURL(resolved)
        }
        return
      }

      if (blobUrlRef.current && blobUrlRef.current !== resolved) {
        URL.revokeObjectURL(blobUrlRef.current)
      }

      blobUrlRef.current = resolved?.startsWith('blob:') ? resolved : null
      setSelectedAvatarUrl(resolved)
    }

    void hydrateAvatar()

    return () => {
      active = false
    }
  }, [avatarOptions, selectedAvatarId])

  const refreshAvatars = async () => {
    const options = await listAvatarOptions()
    setAvatarOptions(options)
  }

  const handleAvatarFileUpload = async (file: File) => {
    setAvatarMessage('')
    setAvatarError('')

    if (!file.name.toLowerCase().endsWith('.vrm')) {
      setAvatarError('Please upload a .vrm avatar file.')
      return
    }

    try {
      const option = await saveAvatarFile(file)
      await refreshAvatars()
      setSelectedAvatar(option.id)
      setSelectedAvatarId(option.id)
      setAvatarMessage(`Loaded avatar: ${option.name}`)
    } catch {
      setAvatarError('Unable to save the avatar file.')
    }
  }

  const handleAvatarUrlSave = async () => {
    setAvatarMessage('')
    setAvatarError('')

    if (!avatarUrlInput.trim()) {
      return
    }

    if (!avatarUrlInput.toLowerCase().includes('.vrm')) {
      setAvatarError('VRM URL should point to a .vrm file.')
      return
    }

    try {
      const option = await saveAvatarUrl(avatarUrlInput.trim(), 'Remote VRM')
      await refreshAvatars()
      setSelectedAvatar(option.id)
      setSelectedAvatarId(option.id)
      setAvatarUrlInput('')
      setAvatarMessage('Remote avatar added.')
    } catch {
      setAvatarError('Failed to save avatar URL.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 text-zinc-100">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle>BitDance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="rounded-md border border-dashed border-zinc-600 px-3 py-2 text-center text-sm text-zinc-200">
                Upload Custom VRM
                <input
                  type="file"
                  accept=".vrm,model/gltf-binary"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void handleAvatarFileUpload(file)
                    }
                  }}
                />
              </label>
              <input
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder="VRM URL"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
              <Button variant="outline" onClick={() => void handleAvatarUrlSave()}>
                Add VRM URL
              </Button>
            </div>
            <select
              value={selectedAvatarId}
              onChange={(e) => {
                setSelectedAvatar(e.target.value)
                setSelectedAvatarId(e.target.value)
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="default">Default Fallback Avatar</option>
              {avatarOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.source})
                </option>
              ))}
            </select>
          </div>

          {avatarMessage && <p className="text-sm text-emerald-400">{avatarMessage}</p>}
          {avatarError && <p className="text-sm text-rose-400">{avatarError}</p>}

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
              <VrmAvatar pose={targetPose} wireframe={mode === 'learn'} opacity={0.88} vrmUrl={selectedAvatarUrl} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative h-[500px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
              <VideoInput
                onReady={(video) => {
                  setVideoEl(video)
                  setCameraError('')
                }}
                onError={(message) => setCameraError(message)}
              />
              <PoseOverlayCanvas video={videoEl} currentPose={currentPose} targetPose={targetPose} />
              <div className="absolute bottom-3 right-3 h-48 w-40 overflow-hidden rounded-lg border border-zinc-600 bg-zinc-900/80">
                <VrmAvatar pose={currentPose} opacity={0.78} vrmUrl={selectedAvatarUrl} />
              </div>
            </div>
            {cameraError && <p className="text-xs text-rose-400">Camera issue: {cameraError}</p>}
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
