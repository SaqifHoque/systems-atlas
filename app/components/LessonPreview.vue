<script setup lang="ts">
import type { Lesson, LessonStatus } from '~~/shared/types'
defineProps<{ lesson: Lesson; curriculum: Lesson[]; completed: string[]; status: LessonStatus; ready: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()
const labels: Record<LessonStatus, string> = { available: 'Available', 'in-progress': 'In progress', completed: 'Completed', recommended: 'Recommended', preview: 'Preview · prerequisites ahead' }
</script>

<template>
  <section class="preview-panel" aria-labelledby="preview-title">
    <div class="preview-top"><span class="eyebrow">LESSON FIELD NOTES</span><span class="lesson-glyph" aria-hidden="true">{{ lesson.icon }}</span></div>
    <p class="lesson-meta">{{ lesson.level }} <span aria-hidden="true">/</span> {{ lesson.minutes }} min</p>
    <h2 id="preview-title" tabindex="-1">{{ lesson.title }}</h2>
    <p class="muted">{{ lesson.subtitle }}</p>
    <span :class="['status-badge', status]">{{ labels[status] }}</span>
    <h3>What you’ll learn</h3>
    <ul class="learn-list"><li v-for="item in lesson.learn" :key="item">{{ item }}</li></ul>
    <h3>Before you begin</h3>
    <p v-if="!lesson.prerequisites.length" class="muted">No experience needed. This is your starting point.</p>
    <ul v-else class="prerequisite-list">
      <li v-for="id in lesson.prerequisites" :key="id">
        <button class="text-button" @click="emit('select', id)"><span aria-hidden="true">{{ completed.includes(id) ? '✓' : '↗' }}</span> {{ curriculum.find(item => item.id === id)?.title }} <span class="prereq-state">{{ completed.includes(id) ? 'Completed' : 'Go to prerequisite' }}</span></button>
      </li>
    </ul>
    <NuxtLink v-if="ready && status !== 'preview'" :to="`/lessons/${lesson.id}`" class="button primary">{{ status === 'completed' ? 'Review lesson' : status === 'in-progress' ? 'Resume lesson' : 'Start lesson' }} <span aria-hidden="true">↗</span></NuxtLink>
    <p v-else-if="ready" class="preview-note">Explore any topic. Complete the prerequisites above to start this lesson.</p>
    <p v-else class="muted" role="status">Restoring your progress…</p>
  </section>
</template>
