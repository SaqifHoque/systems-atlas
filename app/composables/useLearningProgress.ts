import { emptyProgress, isAvailable, parseProgress, recommend, lessonStatus } from '~~/shared/progress'
import type { Lesson, Progress } from '~~/shared/types'

const STORAGE_KEY = 'systems-atlas:progress:v1'

export function useLearningProgress(curriculum: Ref<Lesson[]>) {
  const progress = useState<Progress>('learning-progress', emptyProgress)
  const ready = useState<boolean>('learning-progress-ready', () => false)
  const storageError = useState<boolean>('learning-progress-storage-error', () => false)

  const mounted = ref(false)

  // Wait for both hydration and curriculum, including after a failed API retry.
  function restore() {
    if (!mounted.value || ready.value || !curriculum.value.length) return
    try { progress.value = parseProgress(localStorage.getItem(STORAGE_KEY), curriculum.value) }
    catch { storageError.value = true }
    ready.value = true
  }
  onMounted(() => { mounted.value = true; restore() })
  watch(curriculum, restore)

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress.value)); storageError.value = false }
    catch { storageError.value = true }
  }
  function start(lesson: Lesson) {
    if (!ready.value || !isAvailable(lesson, progress.value)) return
    if (!progress.value.started.includes(lesson.id)) {
      progress.value.started.push(lesson.id)
      save()
    }
  }
  function complete(lesson: Lesson) {
    if (!ready.value || !isAvailable(lesson, progress.value)) return
    if (!progress.value.started.includes(lesson.id)) progress.value.started.push(lesson.id)
    if (!progress.value.completed.includes(lesson.id)) progress.value.completed.push(lesson.id)
    save()
  }

  return {
    progress, ready, storageError, start, complete,
    next: computed(() => recommend(curriculum.value, progress.value)),
    status: (lesson: Lesson) => lessonStatus(lesson, curriculum.value, progress.value),
    available: (lesson: Lesson) => isAvailable(lesson, progress.value),
  }
}
