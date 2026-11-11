import { lessons } from '../../../shared/lessons'

export default defineEventHandler((event) => {
  const lesson = lessons.find(item => item.id === getRouterParam(event, 'id'))
  if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Lesson not found' })
  return lesson
})
