'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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

const ADVANCE_THRESHOLD = 78

function modeButtonClass(isActive: boolean): string {
  return isActive
    ? 'rounded-none border border-amber-700 bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100'
    : 'rounded-none border border-amber-800 bg-amber-100/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900 transition hover:bg-amber-100/70'
}

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
  const progress = ((index + 1) / Math.max(selected.poses.length, 1)) * 100
  const streak = Math.min(100, Math.max(0, (similarity - 40) * 1.4))

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
    <div className="mx-auto max-w-[1500px] space-y-4 px-3 pb-8 pt-4 text-stone-900 sm:px-5 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="deco-panel deco-grid overflow-hidden p-4 sm:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div>
            <p className="deco-title text-[11px] text-amber-800">BitDance Arena</p>
            <h1 className="mt-1 text-3xl text-stone-900 sm:text-4xl">Avatar Performance Chamber</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-700">
              Train like a rhythm game: mirror the target avatar, hit precision thresholds, and chain pose streaks.
            </p>
          </div>

          <div className="deco-panel bg-amber-50/70 px-4 py-3 text-center">
            <p className="deco-title text-[10px] text-amber-800">Similarity</p>
            <p className="text-3xl font-semibold text-stone-900">{similarity.toFixed(1)}%</p>
          </div>

          <div className="deco-panel bg-amber-50/70 px-4 py-3 text-center">
            <p className="deco-title text-[10px] text-amber-800">Sequence</p>
            <p className="text-xl font-semibold text-stone-900">{index + 1}/{selected.poses.length}</p>
          </div>

          <div className="deco-panel bg-amber-50/70 px-4 py-3 text-center">
            <p className="deco-title text-[10px] text-amber-800">Difficulty</p>
            <p className="text-xl font-semibold text-stone-900">{selected.difficulty}</p>
          </div>
        </div>
      </motion.header>

      <section className="deco-panel p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={modeButtonClass(mode === 'learn')} onClick={() => setMode('learn')}>
            Learn Mode
          </button>
          <button type="button" className={modeButtonClass(mode === 'practice')} onClick={() => setMode('practice')}>
            Practice Mode
          </button>
          <button type="button" className={modeButtonClass(false)} onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}>
            Previous Beat
          </button>
          <button
            type="button"
            className={modeButtonClass(false)}
            onClick={() => setIndex((prev) => Math.min(prev + 1, selected.poses.length - 1))}
          >
            Next Beat
          </button>
          <button
            type="button"
            className={modeButtonClass(false)}
            onClick={() => {
              const next = all[(all.findIndex((item) => item.id === selected.id) + 1) % all.length]
              setSelected(next)
              setIndex(0)
            }}
          >
            Next Routine
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="deco-panel overflow-hidden p-3 sm:p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="deco-title text-[11px] text-amber-800">Main Stage</p>
              <h2 className="text-xl text-stone-900 sm:text-2xl">{selected.name}</h2>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-600">Reference Avatar</p>
          </div>

          <div className="relative h-[560px] overflow-hidden border border-amber-900/30 bg-[#13222f] sm:h-[620px]">
            <VrmAvatar pose={targetPose} wireframe={mode === 'learn'} opacity={0.92} vrmUrl={selectedAvatarUrl} />
            <div className="absolute left-3 top-3 rounded-none border border-amber-200/60 bg-stone-900/55 px-3 py-2 text-xs uppercase tracking-[0.2em] text-amber-100">
              Target Pose Hologram
            </div>
            <motion.div
              key={index}
              initial={{ opacity: 0.2, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0 border-[1px] border-amber-200/30"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="deco-title mb-1 text-[10px] text-amber-800">Accuracy Meter</p>
              <div className="deco-meter h-4">
                <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-500" style={{ width: `${similarity}%` }} />
              </div>
            </div>
            <div>
              <p className="deco-title mb-1 text-[10px] text-amber-800">Streak Meter</p>
              <div className="deco-meter h-4">
                <div className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" style={{ width: `${streak}%` }} />
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="space-y-4"
        >
          <div className="deco-panel p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="deco-title text-[10px] text-amber-800">Player Feed</p>
                <h3 className="text-lg text-stone-900">Live Motion Capture</h3>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-600">Current Pose</p>
            </div>

            <div className="relative h-[300px] overflow-hidden border border-amber-900/30 bg-stone-900">
              <VideoInput
                onReady={(video) => {
                  setVideoEl(video)
                  setCameraError('')
                }}
                onError={(message) => setCameraError(message)}
              />
              <PoseOverlayCanvas video={videoEl} currentPose={currentPose} targetPose={targetPose} />
            </div>

            <div className="mt-2 h-[220px] overflow-hidden border border-amber-900/30 bg-[#152634]">
              <VrmAvatar pose={currentPose} opacity={0.86} vrmUrl={selectedAvatarUrl} />
            </div>

            {cameraError && <p className="mt-2 text-xs text-rose-700">Camera issue: {cameraError}</p>}
            <PoseDetection video={videoEl} enabled={mode === 'practice'} onPose={setCurrentPose} />
          </div>

          <div className="deco-panel p-3 sm:p-4">
            <p className="deco-title mb-2 text-[10px] text-amber-800">Avatar Workshop</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="cursor-pointer border border-amber-800 bg-amber-100/50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                Upload VRM
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
                className="border border-amber-800 bg-amber-50 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => void handleAvatarUrlSave()}
                className="border border-amber-800 bg-stone-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100"
              >
                Add URL
              </button>
            </div>

            <select
              value={selectedAvatarId}
              onChange={(e) => {
                setSelectedAvatar(e.target.value)
                setSelectedAvatarId(e.target.value)
              }}
              className="mt-2 w-full border border-amber-800 bg-amber-50 px-3 py-2 text-sm text-stone-900"
            >
              <option value="default">Default Fallback Avatar</option>
              {avatarOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.source})
                </option>
              ))}
            </select>

            {avatarMessage && <p className="mt-2 text-xs text-emerald-700">{avatarMessage}</p>}
            {avatarError && <p className="mt-2 text-xs text-rose-700">{avatarError}</p>}
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="deco-panel p-3 sm:p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="deco-title text-[10px] text-amber-800">Routine Library</p>
            <h3 className="text-lg text-stone-900">Choose or Import Choreography</h3>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-600">Progress {progress.toFixed(0)}%</p>
        </div>
        <ChoreographySelector
          choreographies={customChoreographies}
          onChoose={(item) => {
            setSelected(item)
            setIndex(0)
          }}
          onAdd={(item) => setCustomChoreographies((prev) => [item, ...prev])}
        />
      </motion.section>
    </div>
  )
}
