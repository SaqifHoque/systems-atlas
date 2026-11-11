import test from 'node:test'
import assert from 'node:assert/strict'
import { lessons } from '../../shared/lessons.ts'
import { emptyProgress, parseProgress, isAvailable, recommend, lessonStatus } from '../../shared/progress.ts'

test('curriculum has one root and a valid acyclic prerequisite graph', () => {
  assert.equal(lessons.filter(lesson => !lesson.prerequisites.length).length, 1)
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, lessons.length)
  const visited = new Set()
  const visit = (lesson, ancestors = new Set()) => {
    assert.ok(!ancestors.has(lesson.id), `Cycle at ${lesson.id}`)
    for (const id of lesson.prerequisites) {
      const prerequisite = lessons.find(item => item.id === id)
      assert.ok(prerequisite, `Unknown prerequisite ${id}`)
      visit(prerequisite, new Set([...ancestors, lesson.id]))
    }
    visited.add(lesson.id)
  }
  lessons.forEach(lesson => visit(lesson))
  assert.equal(visited.size, lessons.length)
})

test('restores valid progress and rejects malformed, unknown, and impossible completions', () => {
  for (const input of [null, 'invalid', 'null', '{}', '{"version":2}']) assert.deepEqual(parseProgress(input, lessons), emptyProgress())
  const restored = parseProgress(JSON.stringify({ version: 1, started: ['request', 'unknown', 'request', 7], completed: ['request', 'shortener', 'partitions'] }), lessons)
  assert.deepEqual(restored.completed, ['request', 'shortener'])
  assert.deepEqual(restored.started, ['request', 'shortener'])
  assert.deepEqual(parseProgress(JSON.stringify({ version: 1, completed: lessons.map(l => l.id) }), [...lessons].reverse()).completed.length, lessons.length)
})

test('recommendations respect prerequisites, resume work, and eventually finish all levels', () => {
  const progress = emptyProgress()
  assert.equal(recommend(lessons, progress)?.id, 'request')
  assert.equal(lessonStatus(lessons[0], lessons, progress), 'recommended')
  assert.equal(lessonStatus(lessons[7], lessons, progress), 'preview')
  progress.completed.push('request', 'shortener')
  progress.started.push('queues')
  assert.equal(recommend(lessons, progress)?.id, 'queues')
  assert.equal(lessonStatus(lessons[3], lessons, progress), 'in-progress')
  assert.equal(lessonStatus(lessons[2], lessons, progress), 'available')
  for (let step = 0; step < lessons.length; step++) {
    const next = recommend(lessons, progress)
    if (!next) break
    assert.ok(isAvailable(next, progress))
    progress.completed.push(next.id)
  }
  assert.equal(progress.completed.length, lessons.length)
  assert.equal(recommend(lessons, progress), undefined)
})
