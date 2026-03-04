'use client'

import { useMemo, useState } from 'react'
import { processVideoToChoreography } from '@/lib/video-processor'
import { createPoseDetector } from '@/lib/mediapipe'
import { BUILTIN_CHOREOGRAPHIES } from '@/lib/choreography-data'
import type { Choreography } from '@/types/pose'
import { Button } from '@/components/ui/button'

interface ChoreographySelectorProps {
  choreographies: Choreography[]
  onChoose: (item: Choreography) => void
  onAdd: (item: Choreography) => void
}

export function ChoreographySelector({ choreographies, onChoose, onAdd }: ChoreographySelectorProps) {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [url, setUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  const isLikelyDirectVideoUrl = (value: string): boolean => {
    return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(value)
  }

  const allChoreographies = useMemo(() => {
    return [...BUILTIN_CHOREOGRAPHIES, ...choreographies].filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(query.toLowerCase())
      const levelMatch = difficulty === 'All' || item.difficulty === difficulty
      return nameMatch && levelMatch
    })
  }, [choreographies, difficulty, query])

  const ingestVideo = async (source: 'upload' | 'url', file?: File, videoUrl?: string) => {
    setError('')
    setLoading('Processing choreography video...')
    setProgress(0)

    if (source === 'url' && videoUrl && !isLikelyDirectVideoUrl(videoUrl)) {
      setLoading('')
      setError('Please provide a direct video file URL (for example .mp4 or .webm).')
      return
    }

    const detector = await createPoseDetector()
    try {
      const choreography = await processVideoToChoreography({
        name: file?.name.replace(/\.[^.]+$/, '') || 'Imported URL Routine',
        source,
        difficulty: 'Intermediate',
        detector,
        file,
        videoUrl,
        onProgress: (p) => setProgress(p.percent),
      })

      onAdd(choreography)
      onChoose(choreography)
      setLoading('Done')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video processing failed'
      setLoading('')
      setError(message)
    } finally {
      detector.close?.()
      setTimeout(() => {
        setLoading('')
        setProgress(0)
      }, 1200)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search choreography"
          className="border border-amber-800 bg-amber-50 px-3 py-2 text-sm text-stone-900"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border border-amber-800 bg-amber-50 px-3 py-2 text-sm text-stone-900"
        >
          <option>All</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <label className="cursor-pointer border border-dashed border-amber-800 bg-amber-100/50 px-3 py-2 text-center text-sm text-amber-900">
          Upload Video
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void ingestVideo('upload', file)
              }
            }}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Import from video URL"
          className="flex-1 border border-amber-800 bg-amber-50 px-3 py-2 text-sm text-stone-900"
        />
        <Button
          className="rounded-none border border-amber-800 bg-stone-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100 hover:bg-stone-700"
          onClick={() => {
            if (url.trim()) {
              void ingestVideo('url', undefined, url.trim())
            }
          }}
        >
          Import URL
        </Button>
      </div>

      {loading && (
        <div className="border border-amber-800 bg-amber-50/75 p-3 text-sm text-stone-700">
          {loading}
          <div className="deco-meter mt-2 h-2 w-full">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-3">
        {allChoreographies.map((item) => (
          <button
            key={item.id}
            type="button"
            className="overflow-hidden border border-amber-800 bg-amber-50/70 text-left transition hover:bg-amber-100/80"
            onClick={() => onChoose(item)}
          >
            <img src={item.thumbnailUrl} alt={item.name} className="h-28 w-full object-cover" />
            <div className="space-y-1 p-3">
              <p className="text-sm font-semibold text-stone-900">{item.name}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-amber-900">{item.difficulty}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
