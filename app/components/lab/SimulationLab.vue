<script setup lang="ts">
import type { Lesson } from '~~/shared/types'
import { initialSimState } from '~~/shared/simulation/types'
import { scenariosFor } from '~~/shared/simulation/engine'
import type { Action, Scenario, Simulation } from '~~/shared/simulation/types'

const props = defineProps<{ lesson: Lesson }>()
const emit = defineEmits<{ explored: [kind: 'normal' | 'failure'] }>()
const state = ref(initialSimState())
const simulation = ref<Simulation | null>(null)
const step = ref(0)
const playing = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const tab = ref<'product' | 'architecture'>('product')
const mobile = ref(false)
let media: MediaQueryList | undefined
function updateViewport() { mobile.value = media?.matches ?? false }
onMounted(() => { media = window.matchMedia('(max-width: 760px)'); updateViewport(); media.addEventListener('change', updateViewport) })
const scenario = ref<Scenario>('normal')
const policy = ref<'pause' | 'independent'>('pause')
const longUrl = ref('https://example.com/notes/a-very-long-story')
const key = 'checkout-atlas-001'
const active = computed(() => simulation.value?.events[step.value])
const visibleState = computed(() => active.value?.state ?? state.value)
const locked = computed(() => busy.value || Boolean(simulation.value && step.value < simulation.value.events.length - 1))
const product = computed(() => active.value?.product ?? { title: 'Ready when you are', detail: 'Choose a scenario, then use the product to follow a request.', tone: 'neutral' })
const labels: Record<Scenario, string> = { normal: 'Normal flow', 'database-down': 'Database unavailable', 'worker-down': 'Worker offline', 'lost-ack': 'Acknowledgment lost', timeout: 'Payment response times out', 'leader-down': 'Leader fails', partition: 'Network partition' }
const productNames = { request: 'Shelf · Your reading list', shortener: 'Smallink · Less link, more story', notifications: 'Dispatch · Team updates', payment: 'Field Supply · Checkout', regions: 'Field Supply · Global checkout' }
let timer: ReturnType<typeof setInterval> | undefined
const controller = new AbortController()

function stop() { if (timer) clearInterval(timer); timer = undefined; playing.value = false }
function acknowledge() {
  if (simulation.value && step.value === simulation.value.events.length - 1) {
    emit('explored', simulation.value.failure ? 'failure' : 'normal')
  }
}
function forward() {
  if (!simulation.value) return
  step.value = Math.min(step.value + 1, simulation.value.events.length - 1)
  if (step.value === simulation.value.events.length - 1) { stop(); acknowledge() }
}
function play() {
  if (!simulation.value) return
  stop()
  if (step.value === simulation.value.events.length - 1) step.value = 0
  playing.value = true
  timer = setInterval(forward, 750)
}
function replay() { if (!simulation.value) return; step.value = 0; play() }
function reset() {
  stop(); state.value = initialSimState(); simulation.value = null; step.value = 0; errorMessage.value = ''
}
function changePolicy() { reset() }
watch(scenario, () => { if (props.lesson.lab === 'regions' && scenario.value !== 'leader-down') reset() })

async function run(action: Action, restoreNormal = false) {
  if (locked.value) return
  stop(); busy.value = true; errorMessage.value = ''
  if (restoreNormal) scenario.value = 'normal'
  try {
    const response = await $fetch<Simulation>('/api/simulate', {
      method: 'POST', signal: controller.signal,
      body: { lessonId: props.lesson.id, action, scenario: scenario.value, policy: policy.value, state: state.value, url: longUrl.value, key, amount: 4900 },
    })
    simulation.value = response; state.value = response.state; step.value = 0
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play()
  } catch (error) {
    if (!controller.signal.aborted) {
      const failure = error as { data?: { statusMessage?: string } }
      errorMessage.value = failure.data?.statusMessage ?? 'The lab could not respond. Your previous result is unchanged; try again.'
    }
  } finally { busy.value = false }
}
onBeforeUnmount(() => { stop(); controller.abort(); media?.removeEventListener('change', updateViewport) })
function moveTab(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  tab.value = event.key === 'Home' ? 'product' : event.key === 'End' ? 'architecture' : tab.value === 'product' ? 'architecture' : 'product'
  nextTick(() => document.getElementById(`lab-tab-${tab.value}`)?.focus())
}
</script>

<template>
  <section class="simulation-lab" aria-labelledby="lab-title" :aria-busy="busy">
    <header class="lab-heading"><div><p class="eyebrow">TRY IT, THEN TRACE IT</p><h2 id="lab-title">A real interaction. A visible system.</h2></div><span class="simulation-label">SIMULATION</span></header>
    <div class="scenario-controls">
      <div class="scenario-field"><label for="lab-scenario">Scenario</label><select id="lab-scenario" v-model="scenario" :disabled="locked"><option v-for="item in scenariosFor[lesson.lab]" :key="item" :value="item">{{ labels[item] }}</option></select></div>
      <div v-if="lesson.lab === 'regions' && scenario === 'partition'" class="scenario-field"><label for="lab-policy">During a partition</label><select id="lab-policy" v-model="policy" :disabled="locked" @change="changePolicy"><option value="pause">Pause writes · require confirmation</option><option value="independent">Accept writes independently</option></select></div>
      <button class="text-button lab-reset" :disabled="busy" @click="reset">Reset lab</button>
    </div>
    <p v-if="lesson.lab === 'regions'" class="lab-hint">Changing a scenario or partition policy starts a fresh comparison with one available item. For failover, run a normal checkout first, then select Leader fails.</p>
    <p v-if="errorMessage" class="lab-error" role="alert">{{ errorMessage }}</p>
    <div class="lab-tabs" role="tablist" aria-label="Lab views"><button id="lab-tab-product" :tabindex="tab === 'product' ? 0 : -1" role="tab" :aria-selected="tab === 'product'" aria-controls="lab-product" @click="tab = 'product'" @keydown="moveTab">Product</button><button id="lab-tab-architecture" :tabindex="tab === 'architecture' ? 0 : -1" role="tab" :aria-selected="tab === 'architecture'" aria-controls="lab-architecture" @click="tab = 'architecture'" @keydown="moveTab">Architecture</button></div>
    <div :class="['lab-split', `show-${tab}`]">
      <div id="lab-product" class="product-panel" :role="mobile ? 'tabpanel' : 'region'" :aria-labelledby="mobile ? 'lab-tab-product' : undefined" aria-label="Simulated product">
        <div class="product-chrome"><span aria-hidden="true">● ● ●</span><span>{{ productNames[lesson.lab] }}</span></div>
        <div class="product-body">
          <template v-if="lesson.lab === 'request'"><p class="eyebrow">YOUR LITTLE LIBRARY</p><h3>A shelf of good ideas.</h3><p class="muted">Two books, waiting on the other side of a request.</p><button class="button primary" :disabled="locked" @click="run('load')">Load collection ↗</button><div v-if="product.tone === 'success'" class="book-list"><span>The Design of Everyday Things</span><span>A Philosophy of Software Design</span></div></template>
          <template v-else-if="lesson.lab === 'shortener'"><p class="eyebrow">MAKE ROOM FOR THE STORY</p><h3>A shorter way to share.</h3><label class="product-field">Destination URL<input v-model="longUrl" type="url" :disabled="locked" maxlength="2048"></label><button class="button primary" :disabled="locked" @click="run('shorten')">Shorten URL ↗</button><div v-if="visibleState.links.length" class="short-link"><span>YOUR NEW LINK</span><strong>atlas.test/s/{{ visibleState.links.at(-1)?.code }}</strong><button class="button secondary" :disabled="locked" @click="run('open')">Open short link</button><button v-if="lesson.id === 'cache'" class="text-button" :disabled="locked || !visibleState.cached" @click="run('expire')">Expire key & open again</button></div></template>
          <template v-else-if="lesson.lab === 'notifications'"><p class="eyebrow">KEEP EVERYONE IN THE LOOP</p><h3>A little update. Reliably delivered.</h3><div class="notification-draft"><strong>Atlas team</strong><p>Your field notes are ready to review.</p></div><button class="button primary" :disabled="locked" @click="run('send')">Send notification ↗</button><button v-if="state.queued.length" class="button secondary" :disabled="locked" @click="run('retry', true)">Retry pending delivery</button><div class="inbox"><h4>Inbox · {{ visibleState.delivered.length }} unique messages</h4><p v-if="!visibleState.delivered.length" class="muted">No messages yet.</p><p v-for="id in visibleState.delivered" :key="id">✓ Field notes ready <small>{{ id }}</small></p><small>{{ visibleState.queued.length }} job(s) waiting in queue</small></div></template>
          <template v-else><p class="eyebrow">A LITTLE SOMETHING FOR THE JOURNEY</p><div class="checkout-item"><span class="notebook-cover" aria-hidden="true">A<br>FIELD NOTES</span><div><h3>The field notebook</h3><p>Forest green · Qty 1</p><strong>$49.00</strong></div></div><p v-if="lesson.lab === 'regions'" class="stock-note">1 item · 2 regions · {{ scenario === 'partition' && policy === 'independent' ? 'independent writes' : 'confirmed writes' }}</p><p v-if="lesson.lab === 'regions' && scenario === 'partition'" class="stock-note">Two shoppers, one last item: Pay submits one attempt from Region A and another from Region B.</p><p v-if="lesson.lab === 'payment'" class="idempotency-note">Idempotency key <code>{{ key }}</code></p><button class="button primary" :disabled="locked" @click="run('pay')">Pay $49.00 ↗</button><button v-if="lesson.lab === 'payment' && state.charges.length" class="button secondary" :disabled="locked" @click="run('pay', true)">Retry with same key</button></template>
          <div :class="['product-outcome', product.tone]" role="status"><strong>{{ busy ? 'Sending the request…' : product.title }}</strong><p>{{ product.detail }}</p></div>
          <div v-if="lesson.lab === 'payment'" class="lab-ledger"><h4>Simulated charge ledger</h4><p data-testid="charge-count">{{ visibleState.charges.length }} charge(s)</p><p v-for="charge in visibleState.charges" :key="charge.key"><code>{{ charge.key }}</code><span>${{ (charge.amount / 100).toFixed(2) }}</span></p></div>
          <div v-if="lesson.lab === 'regions'" class="lab-ledger"><h4>Simulated order ledger</h4><p data-testid="order-count">{{ visibleState.orders.length }} order(s) · 1 original item</p><p v-for="order in visibleState.orders" :key="order.id">{{ order.id }}<span>Region {{ order.region }}</span></p><small>{{ visibleState.replicaOrders.length }} order(s) confirmed in the replica</small></div>
        </div>
      </div>
      <div id="lab-architecture" class="architecture-panel" :role="mobile ? 'tabpanel' : 'region'" :aria-labelledby="mobile ? 'lab-tab-architecture' : undefined" aria-label="Architecture and component inspection"><p class="eyebrow">BEHIND THIS CLICK</p><LabArchitectureTrace :kind="lesson.lab" :with-cache="lesson.id === 'cache'" :event="active" :step="step" :promoted="visibleState.promoted" :independent="lesson.lab === 'regions' && scenario === 'partition' && policy === 'independent'" /></div>
    </div>
    <div class="trace-console">
      <div class="trace-controls"><span class="eyebrow">{{ simulation ? `EVENT ${step + 1} / ${simulation.events.length}` : 'FOLLOW THE REQUEST' }}</span><div><button class="button secondary" :disabled="busy || !simulation || step === 0" @click="stop(); step--">Previous event</button><button class="button secondary" :disabled="busy || !simulation || step === (simulation?.events.length ?? 0) - 1" @click="stop(); forward()">Next event</button><button class="button secondary" :disabled="busy || !simulation" @click="playing ? stop() : play()">{{ playing ? 'Pause flow' : 'Play flow' }}</button><button class="text-button" :disabled="busy || !simulation" @click="replay">Replay flow ↻</button></div></div>
      <div class="event-detail" aria-live="polite"><h3>{{ active?.title ?? 'Your first event starts with a click.' }}</h3><p>{{ active?.detail ?? 'Use the product above. Then step through each event, or let the flow play.' }}</p></div>
      <ol v-if="simulation" class="event-list" aria-label="Request events"><li v-for="(event, index) in simulation.events" :key="index"><button :disabled="busy" :aria-current="index === step ? 'step' : undefined" @click="stop(); step = index; acknowledge()"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ event.title }}<small>{{ event.duration }} ms</small></button></li></ol>
      <div v-if="simulation" class="sim-metrics"><span>Simulated flow time <strong>{{ simulation.metrics.latency }} ms</strong></span><span>Modeled events <strong>{{ simulation.metrics.operations }}</strong></span><span v-if="lesson.lab === 'request' && !simulation.failure">One sequential worker <strong>{{ (1000 / simulation.metrics.latency).toFixed(0) }} requests/s</strong></span></div>
      <div v-if="lesson.lab === 'request' && simulation" class="latency-visual"><h4>One request, from click to response</h4><div class="latency-segments" aria-label="Time spent in each part of this request"><span v-for="(event, index) in simulation.events" :key="index" :style="{ flex: event.duration }" :title="event.title">{{ event.duration }} ms</span></div><p>Latency is the time for this whole trip. Throughput counts how many requests finish each second. With one sequential worker and 100 ms trips, the normal-flow capacity is 10 requests per second.</p></div>
    </div>
    <details class="simulation-assumptions"><summary>What this simulation assumes</summary><ul v-if="simulation"><li v-for="assumption in simulation.assumptions" :key="assumption">{{ assumption }}</li></ul><p v-else>Deterministic, illustrative timings; browser-supplied, temporary state. No external URLs are fetched and no actual payment, email, database, or account is used. Run an action to see the case-specific assumptions.</p><p>The diagram plays at a readable pace. Animation time is separate from simulated flow time. Background delivery time is not the HTTP acceptance latency.</p></details>
  </section>
</template>
