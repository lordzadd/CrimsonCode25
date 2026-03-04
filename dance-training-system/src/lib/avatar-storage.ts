export interface AvatarOption {
  id: string
  name: string
  source: 'url' | 'file'
  createdAt: string
  url?: string
}

interface AvatarRecord {
  id: string
  name: string
  blob: Blob
  createdAt: string
}

const DB_NAME = 'bitdance-assets'
const STORE_NAME = 'avatars'
const META_KEY = 'bitdance.avatars.meta.v1'
const SELECTED_KEY = 'bitdance.avatars.selected.v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function loadMeta(): AvatarOption[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(META_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as AvatarOption[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMeta(meta: AvatarOption[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export async function listAvatarOptions(): Promise<AvatarOption[]> {
  return loadMeta().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getSelectedAvatarId(): string {
  if (typeof window === 'undefined') {
    return 'default'
  }

  return window.localStorage.getItem(SELECTED_KEY) ?? 'default'
}

export function setSelectedAvatarId(id: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SELECTED_KEY, id)
}

export async function saveAvatarFile(file: File): Promise<AvatarOption> {
  const id = `avatar-file-${Date.now()}`
  const meta = loadMeta()
  const entry: AvatarOption = {
    id,
    name: file.name.replace(/\.[^.]+$/, ''),
    source: 'file',
    createdAt: new Date().toISOString(),
  }

  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put({
      id,
      name: entry.name,
      blob: file,
      createdAt: entry.createdAt,
    } as AvatarRecord)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })

  saveMeta([entry, ...meta])
  return entry
}

export async function saveAvatarUrl(url: string, name?: string): Promise<AvatarOption> {
  const meta = loadMeta()
  const entry: AvatarOption = {
    id: `avatar-url-${Date.now()}`,
    name: name?.trim() || `URL Avatar ${meta.length + 1}`,
    source: 'url',
    url,
    createdAt: new Date().toISOString(),
  }

  saveMeta([entry, ...meta])
  return entry
}

export async function resolveAvatarUrl(option: AvatarOption): Promise<string | undefined> {
  if (option.source === 'url') {
    return option.url
  }

  const db = await openDb()

  return new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(option.id)

    req.onsuccess = () => {
      const record = req.result as AvatarRecord | undefined
      if (!record) {
        resolve(undefined)
        return
      }

      resolve(URL.createObjectURL(record.blob))
    }

    req.onerror = () => reject(req.error)
  })
}
