<script setup lang="ts">
import { componentsFor } from '~~/shared/simulation/components'
import type { ComponentId, LabKind, SimEvent } from '~~/shared/simulation/types'
const props = defineProps<{ kind: LabKind; withCache: boolean; event?: SimEvent; step: number; promoted: boolean; independent: boolean }>()
const nodes = computed(() => componentsFor(props.kind, props.withCache))
const selected = ref<ComponentId>('api')
const inspected = computed(() => nodes.value.find(item => item.id === selected.value) ?? nodes.value[0]!)
const activePath = computed(() => {
  const from = nodes.value.find(item => item.id === props.event?.from)
  const to = nodes.value.find(item => item.id === props.event?.to)
  if (!from || !to) return ''
  // Curves make return trips visible even when two nodes share a row or column.
  return `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2 + (from.y === to.y ? 0 : 50)} ${(from.y + to.y) / 2 - (from.y === to.y ? 45 : 0)} ${to.x} ${to.y}`
})
const connections = computed(() => {
  const pairs: [ComponentId, ComponentId][] = [['browser', 'api'], ['api', 'database'], ['api', 'cache'], ['database', 'queue'], ['api', 'queue'], ['queue', 'worker'], ['worker', 'database'], ['api', 'region-a'], ['region-a', 'region-b'], ['api', 'region-b']]
  return pairs.flatMap(([a, b]) => {
    const from = nodes.value.find(item => item.id === a), to = nodes.value.find(item => item.id === b)
    return from && to ? [{ id: `${a}-${b}`, path: `M ${from.x} ${from.y} L ${to.x} ${to.y}` }] : []
  })
})
const name = (id: ComponentId, fallback: string) => id === 'region-b' && props.promoted ? 'Region B · new leader' : props.independent && id.startsWith('region-') ? `Region ${id === 'region-a' ? 'A' : 'B'} · local writes` : fallback
</script>

<template>
  <div class="architecture-trace">
    <svg viewBox="0 0 600 370" role="group" aria-label="Interactive architecture diagram. Select a component to inspect it.">
      <path v-for="connection in connections" :key="connection.id" :d="connection.path" class="diagram-connection" />
      <path v-if="activePath" :d="activePath" class="active-connection" />
      <g v-for="node in nodes" :key="node.id" :transform="`translate(${node.x - 72}, ${node.y - 30})`" role="button" tabindex="0" :aria-label="`Inspect ${name(node.id, node.name)}`" :aria-pressed="selected === node.id" :class="['diagram-node', { active: event?.to === node.id || event?.from === node.id, inspected: selected === node.id }]" @click="selected = node.id" @keydown.enter.prevent="selected = node.id" @keydown.space.prevent="selected = node.id">
        <rect width="144" height="60" rx="10" /><text x="72" :y="name(node.id, node.name).includes(' · ') ? 23 : 35" text-anchor="middle"><tspan x="72">{{ name(node.id, node.name).split(' · ')[0] }}</tspan><tspan v-if="name(node.id, node.name).includes(' · ')" x="72" dy="22" class="node-role">{{ name(node.id, node.name).split(' · ')[1] }}</tspan></text>
      </g>
      <circle v-if="activePath" :key="`${step}-${event?.title}`" r="6" class="request-packet"><animateMotion :path="activePath" dur="0.7s" fill="freeze" /></circle>
    </svg>
    <div class="component-inspector" aria-live="polite"><p class="eyebrow">COMPONENT FIELD NOTES</p><h4>{{ name(inspected.id, inspected.name) }}</h4><dl><dt>Its job</dt><dd>{{ promoted && inspected.id === 'region-b' ? 'Now owns writes after the external safe promotion and fencing decision.' : independent && inspected.id.startsWith('region-') ? 'Accepts writes using its own local inventory view while the regions cannot communicate.' : inspected.job }}</dd><dt>What can fail</dt><dd>{{ inspected.failure }}</dd><dt>Why it’s here</dt><dd>{{ inspected.reason }}</dd></dl></div>
  </div>
</template>
