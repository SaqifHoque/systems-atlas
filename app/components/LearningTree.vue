<script setup lang="ts">
import type { Lesson, LessonStatus } from '~~/shared/types'
const props = defineProps<{ curriculum: Lesson[]; selected: string; status: (lesson: Lesson) => LessonStatus }>()
const emit = defineEmits<{ select: [id: string] }>()
const labels: Record<LessonStatus, string> = { available: 'Available', 'in-progress': 'In progress', completed: 'Completed', recommended: 'Recommended', preview: 'Preview' }
const edges = computed(() => props.curriculum.flatMap(lesson => lesson.prerequisites.map(id => {
  const from = props.curriculum.find(item => item.id === id)!
  // All coordinates share the same 1000 × 1000 viewBox as the HTML node positions.
  const x1 = from.x * 10, x2 = lesson.x * 10
  const y1 = from.y * 10 + 51, y2 = lesson.y * 10 - 51
  const middle = (y1 + y2) / 2
  return { id: `${id}-${lesson.id}`, from, to: lesson, path: `M ${x1} ${y1} C ${x1} ${middle}, ${x2} ${middle}, ${x2} ${y2}` }
})))
</script>

<template>
  <section class="tree-section" aria-labelledby="tree-title">
    <div class="section-heading"><h2 id="tree-title" tabindex="-1">Your learning map</h2><span class="muted">8 lessons · 4 levels</span></div>
    <p class="map-help">Follow the connections. Select any lesson to explore it.</p>
    <div class="tree-canvas">
      <svg class="tree-edges" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="group" aria-label="Prerequisite connections">
        <path v-for="edge in edges" :key="edge.id" :d="edge.path" :class="{ 'edge-complete': status(edge.from) === 'completed', 'edge-selected': selected === edge.to.id }" role="button" tabindex="0" :aria-label="`${edge.from.title} is required before ${edge.to.title}. Preview prerequisite.`" @click="emit('select', edge.from.id)" @keydown.enter.prevent="emit('select', edge.from.id)" @keydown.space.prevent="emit('select', edge.from.id)" />
      </svg>
      <ol class="tree-nodes">
        <li v-for="(lesson, index) in curriculum" :key="lesson.id" :style="{ '--x': `${lesson.x}%`, '--y': `${lesson.y}%` }">
          <button :class="['lesson-node', status(lesson), { selected: selected === lesson.id }]" :aria-pressed="selected === lesson.id" :aria-label="`${index === 0 ? 'Start here: ' : ''}${lesson.title}, ${lesson.level}, ${labels[status(lesson)]}`" @click="emit('select', lesson.id)">
            <span v-if="index === 0" class="start-label">START HERE</span>
            <span class="node-top"><span class="node-number">{{ String(index + 1).padStart(2, '0') }} / {{ lesson.level }}</span><span aria-hidden="true">{{ status(lesson) === 'completed' ? '✓' : lesson.icon }}</span></span>
            <strong>{{ lesson.title }}</strong>
            <span class="node-bottom"><span class="node-state">{{ labels[status(lesson)] }}</span><span>{{ lesson.minutes }} min</span></span>
          </button>
          <div class="mobile-prereqs"><span v-if="!lesson.prerequisites.length">No prerequisites</span><template v-else>Requires: <button v-for="id in lesson.prerequisites" :key="id" class="text-button" @click="emit('select', id)">{{ curriculum.find(item => item.id === id)?.title }}</button></template></div>
        </li>
      </ol>
      <div class="track-label performance">PERFORMANCE</div><div class="track-label reliability">RELIABILITY</div><div class="track-label consistency">CONSISTENCY</div>
    </div>
    <ul class="map-legend" aria-label="Lesson status legend"><li v-for="(label, key) in labels" :key="key"><span :class="['legend-dot', key]" aria-hidden="true" />{{ label }}</li></ul>
  </section>
</template>
