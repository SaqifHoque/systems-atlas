<script setup lang="ts">
const { data, error, refresh } = await useFetch('/api/lessons')
const curriculum = computed(() => data.value ?? [])
const { progress, ready, storageError, next, status } = useLearningProgress(curriculum)
const selectedId = ref('request')
const selected = computed(() => curriculum.value.find(lesson => lesson.id === selectedId.value) ?? curriculum.value[0])
async function select(id: string) {
  selectedId.value = id
  await nextTick()
  document.getElementById('preview-title')?.focus()
}
function backToMap() { document.getElementById('tree-title')?.focus() }
useHead({ title: 'Your learning map — Systems Atlas' })
</script>

<template>
  <main id="main">
    <section class="map-intro">
      <div><p class="eyebrow">YOUR FIELD GUIDE TO SYSTEM DESIGN</p><h1>Find your way<br>through the system.</h1><p class="lead">Start with a single request. Build the intuition to understand<br class="desktop-break"> the systems behind your everyday apps.</p></div>
      <div class="progress-card"><span class="eyebrow">YOUR EXPEDITION</span><strong>{{ ready ? progress.completed.length : '—' }}<span> / 8</span></strong><span class="muted">lessons completed</span><progress :value="ready ? progress.completed.length : 0" max="8" aria-label="Lessons completed" /><small v-if="!storageError">Progress stays in this browser.</small><small v-else role="status">Browser storage is unavailable. Progress lasts for this visit.</small></div>
    </section>

    <div v-if="error" class="error-card" role="alert"><h2>The map couldn’t load.</h2><p>Check your connection and try again.</p><button class="button primary" @click="refresh()">Try again</button></div>
    <template v-else-if="curriculum.length">
      <section v-if="next" class="next-card" aria-labelledby="next-title"><span class="next-compass" aria-hidden="true">↗</span><div><p class="eyebrow">{{ ready && progress.started.includes(next.id) ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR NEXT STEP' }}</p><h2 id="next-title">{{ next.title }}</h2><p>{{ next.reason }}</p></div><NuxtLink v-if="ready" class="button primary" :to="`/lessons/${next.id}`">{{ progress.started.includes(next.id) ? 'Resume lesson' : 'Start lesson' }} <span aria-hidden="true">↗</span></NuxtLink><span v-else role="status">Restoring progress…</span></section>
      <section v-else class="next-card"><span class="next-compass" aria-hidden="true">✓</span><div><h2>You’ve explored the whole atlas.</h2><p>Every lesson is ready to revisit. Choose a topic below to refresh your understanding.</p></div></section>
      <div class="learning-layout">
        <LearningTree :curriculum="curriculum" :selected="selectedId" :status="status" @select="select" />
        <aside v-if="selected" class="preview-column"><LessonPreview :lesson="selected" :curriculum="curriculum" :completed="progress.completed" :status="status(selected)" :ready="ready" @select="select" /><button class="text-button back-map" @click="backToMap">↑ Back to the learning map</button></aside>
      </div>
      <p class="scope-note">This edition includes reading lessons and prediction checkpoints. Interactive product simulations are coming in a later release.</p>
    </template>
  </main>
</template>
