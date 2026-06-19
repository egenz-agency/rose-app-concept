// localStorage fallback for memory stars — works without Supabase credentials

const KEY = "enchanted_rose_stars"

export interface LocalStar {
  id: string
  title: string
  date: string
  memory: string
  photos: string[]
  position_x: number
  position_y: number
  position_z: number
  created_at: string
}

function load(): LocalStar[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

function save(stars: LocalStar[]) {
  localStorage.setItem(KEY, JSON.stringify(stars))
}

export function localStars_getAll(): LocalStar[] {
  return load()
}

export function localStars_create(data: Omit<LocalStar, "id" | "created_at">): LocalStar {
  const star: LocalStar = {
    ...data,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  }
  save([...load(), star])
  return star
}

export function localStars_delete(id: string) {
  save(load().filter((s) => s.id !== id))
}
