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

  const allChoreographies = useMemo(() => {
    return [...BUILTIN_CHOREOGRAPHIES, ...choreographies].filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(query.toLowerCase())
      const levelMatch = difficulty === 'All' || item.difficulty === difficulty
      return nameMatch && levelMatch
    })
  }, [choreographies, difficulty, query])

  const ingestVideo = async (source: 'upload' | 'url', file?: File, videoUrl?: string) => {
    setLoading('Processing choreography video...')
    setProgress(0)

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
    } catch {
      setLoading('Video processing failed')
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
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option>All</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <label className="rounded-md border border-dashed border-zinc-600 px-3 py-2 text-center text-sm text-zinc-200">
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
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
        <Button
          variant="outline"
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
        <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">
          {loading}
          <div className="mt-2 h-2 w-full rounded bg-zinc-700">
            <div className="h-2 rounded bg-cyan-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {allChoreographies.map((item) => (
          <button
            key={item.id}
            type="button"
            className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 text-left transition hover:border-cyan-400"
            onClick={() => onChoose(item)}
          >
            <img src={item.thumbnailUrl} alt={item.name} className="h-28 w-full object-cover" />
            <div className="space-y-1 p-3">
              <p className="text-sm font-semibold text-zinc-100">{item.name}</p>
              <p className="text-xs text-zinc-400">{item.difficulty}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
