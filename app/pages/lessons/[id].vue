<script setup lang="ts">
import type { Lesson } from '~~/shared/types'
definePageMeta({ key: route => route.fullPath })
const route = useRoute()
const { data: curriculumData, error: curriculumError } = await useFetch('/api/lessons')
if (curriculumError.value || !curriculumData.value?.length) throw createError({ statusCode: 503, statusMessage: 'Curriculum unavailable. Please try again.' })
const curriculum = computed(() => curriculumData.value ?? [])
const { data: lessonData, error } = await useFetch(`/api/lessons/${encodeURIComponent(String(route.params.id))}`)
if (error.value || !lessonData.value) throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Lesson unavailable' })
const lesson = lessonData as Ref<Lesson>
const { ready, progress, next, storageError, start, complete, available } = useLearningProgress(curriculum)
const choice = ref<number | null>(null)
const checked = ref(false)
const explored = ref({ normal: false, failure: false })
const passed = computed(() => checked.value && choice.value === lesson.value.answer)
const finished = computed(() => progress.value.completed.includes(lesson.value.id))
watch(ready, (value) => { if (value) start(lesson.value) }, { immediate: true })
function checkAnswer() { if (choice.value !== null) checked.value = true }
function finish() { if (passed.value) complete(lesson.value) }
useHead({ title: `${lesson.value.title} — Systems Atlas` })
</script>

<template>
  <main id="main" class="lesson-page">
    <NuxtLink to="/" class="text-link">← Back to your learning map</NuxtLink>
    <header class="lesson-heading"><p class="eyebrow">{{ lesson.level }} / {{ lesson.track }} / {{ lesson.minutes }} MIN</p><h1>{{ lesson.title }}</h1><p class="lead">{{ lesson.subtitle }}</p></header>
    <p v-if="!ready" role="status">Restoring your progress…</p>
    <section v-else-if="!available(lesson)" class="prerequisite-gate" aria-labelledby="gate-title"><h2 id="gate-title">A few stepping stones first</h2><p>You can preview this topic on the map. Complete these prerequisites to start:</p><ul><li v-for="id in lesson.prerequisites.filter(id => !progress.completed.includes(id))" :key="id"><NuxtLink :to="`/lessons/${id}`">{{ curriculum.find(item => item.id === id)?.title }}</NuxtLink></li></ul></section>
    <template v-else>
      <LabSimulationLab :lesson="lesson" @explored="kind => explored[kind] = true" />
      <p class="lab-explored"><span>{{ explored.normal ? '✓ Normal flow explored' : 'Try the normal flow' }}</span><span>{{ explored.failure ? '✓ Failure scenario explored' : 'Then try a failure scenario' }}</span></p>
      <div class="lesson-content">
      <p v-if="storageError" role="status" class="preview-note">Browser storage is unavailable. Your progress will last for this visit.</p>
      <section><span class="reading-step">01</span><h2>What the user sees</h2><p>{{ lesson.story }}</p></section>
      <section><span class="reading-step">02</span><h2>Follow the request</h2><p>{{ lesson.trace }}</p></section>
      <section><span class="reading-step">03</span><h2>The trade-off</h2><p>{{ lesson.tradeoff }}</p></section>
      <section class="checkpoint" aria-labelledby="checkpoint-title">
        <p class="eyebrow">PAUSE & PREDICT</p><h2 id="checkpoint-title">{{ lesson.question }}</h2>
        <form @submit.prevent="checkAnswer">
          <fieldset><legend class="sr-only">Choose your prediction</legend><label v-for="(option, index) in lesson.options" :key="option" :class="['answer-option', { chosen: choice === index }]"><input v-model="choice" type="radio" name="prediction" :value="index" @change="checked = false"><span>{{ option }}</span></label></fieldset>
          <button class="button primary" :disabled="choice === null" type="submit">Check prediction</button>
        </form>
        <div v-if="checked" class="answer-feedback" role="status"><h3>{{ passed ? 'You’ve got it.' : 'Let’s trace it once more.' }}</h3><p>{{ passed ? lesson.explanation : 'Follow the request through each component above, then try another prediction. You can retry as often as you like.' }}</p><a :href="lesson.source.url" target="_blank" rel="noopener noreferrer">Read the source: {{ lesson.source.title }} ↗</a></div>
      </section>
      <div class="lesson-finish">
        <button v-if="!finished" class="button primary" :disabled="!passed" @click="finish">Complete lesson <span aria-hidden="true">✓</span></button>
        <div v-else role="status"><p class="completion-label">✓ Lesson completed</p><template v-if="next"><p class="eyebrow">UP NEXT</p><h2>{{ next.title }}</h2><p>{{ next.reason }}</p><NuxtLink class="button primary" :to="`/lessons/${next.id}`">Continue to next lesson ↗</NuxtLink></template><template v-else><h2>You’ve completed the atlas.</h2><NuxtLink class="button primary" to="/">Return to your learning map ↗</NuxtLink></template></div>
        <p v-if="!finished && !passed" class="muted">Answer the prediction correctly to complete this lesson.</p>
      </div>
      </div>
    </template>
  </main>
</template>
