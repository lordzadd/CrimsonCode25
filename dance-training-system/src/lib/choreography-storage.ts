import type { Choreography } from '@/types/pose'

const STORAGE_KEY = 'bitdance.customChoreographies.v1'

export function loadCustomChoreographies(): Choreography[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Choreography[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

export function saveCustomChoreographies(choreographies: Choreography[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choreographies))
}
