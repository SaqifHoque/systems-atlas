import { lessons } from '../../shared/lessons'
import { simulate } from '../../shared/simulation/engine'
import { validateSimInput } from '../../shared/simulation/validate'

export default defineEventHandler(async (event) => {
  // Bound the disposable client state; never proxy submitted URLs or make external calls.
  const raw = await readRawBody(event)
  if (!raw || raw.length > 32768) throw createError({ statusCode: 413, statusMessage: 'Simulation payload is empty or too large.' })
  let body: unknown
  try { body = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Expected JSON.' }) }
  if (!body || typeof body !== 'object' || !('lessonId' in body)) throw createError({ statusCode: 400, statusMessage: 'A lesson ID is required.' })
  const lesson = lessons.find(item => item.id === body.lessonId)
  if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Lesson not found.' })
  try {
    const input = validateSimInput(body, lesson.lab)
    setHeader(event, 'Cache-Control', 'no-store')
    return simulate(lesson.lab, input)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Invalid simulation input.' })
  }
})
