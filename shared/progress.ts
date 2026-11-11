import type { Lesson, LessonStatus, Progress } from './types'

export const emptyProgress = (): Progress => ({ version: 1, started: [], completed: [] })

// Only accept known IDs, and never restore completion without its prerequisites.
export function parseProgress(raw: string | null, curriculum: Lesson[]): Progress {
  if (!raw) return emptyProgress()
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) return emptyProgress()
    const data = value as Record<string, unknown>
    const known = new Set(curriculum.map(lesson => lesson.id))
    const ids = (input: unknown) => Array.isArray(input) ? [...new Set(input.filter((id): id is string => typeof id === 'string' && known.has(id)))] : []
    const requested = new Set(ids(data.completed))
    const completed = new Set<string>()
    // Iterate to a fixed point so the parser does not depend on curriculum order.
    for (let pass = 0; pass < curriculum.length; pass++) {
      for (const lesson of curriculum) {
        if (requested.has(lesson.id) && lesson.prerequisites.every(id => completed.has(id))) completed.add(lesson.id)
      }
    }
    return { version: 1, started: [...new Set([...ids(data.started), ...completed])], completed: [...completed] }
  } catch { return emptyProgress() }
}

export function isAvailable(lesson: Lesson, progress: Progress): boolean {
  return lesson.prerequisites.every(id => progress.completed.includes(id))
}

export function recommend(curriculum: Lesson[], progress: Progress): Lesson | undefined {
  const available = curriculum.filter(lesson => !progress.completed.includes(lesson.id) && isAvailable(lesson, progress))
  return available.find(lesson => progress.started.includes(lesson.id)) ?? available[0]
}

export function lessonStatus(lesson: Lesson, curriculum: Lesson[], progress: Progress): LessonStatus {
  if (progress.completed.includes(lesson.id)) return 'completed'
  if (!isAvailable(lesson, progress)) return 'preview'
  if (progress.started.includes(lesson.id)) return 'in-progress'
  if (recommend(curriculum, progress)?.id === lesson.id) return 'recommended'
  return 'available'
}
