import type { LabKind, SimInput, SimState } from './types'
import { actionsFor, scenariosFor } from './engine.ts'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.')
  return value as Record<string, unknown>
}
function integer(value: unknown, max = 1000): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > max) throw new Error('Invalid simulation counter. Reset the lab.')
  return value as number
}
function string(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.length || value.length > max) throw new Error('Invalid simulation text.')
  return value
}
function list(value: unknown, max = 50): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Lab limit reached. Reset the lab.')
  return value
}
function url(value: unknown): string {
  const text = string(value, 2048)
  let parsed: URL
  try { parsed = new URL(text) } catch { throw new Error('Enter a full http or https URL.') }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use an http or https URL without credentials.')
  return parsed.href
}
function parseState(value: unknown): SimState {
  const state = record(value)
  const cached = state.cached === null ? null : record(state.cached)
  if (typeof state.promoted !== 'boolean') throw new Error('Invalid promotion state.')
  return {
    clock: integer(state.clock, 999), sequence: integer(state.sequence, 999), promoted: state.promoted,
    links: list(state.links).map(item => { const link = record(item); return { code: string(link.code, 20), url: url(link.url) } }),
    cached: cached ? { code: string(cached.code, 20), expiresAt: integer(cached.expiresAt, 1003) } : null,
    queued: list(state.queued).map(item => string(item, 80)),
    delivered: list(state.delivered).map(item => string(item, 80)),
    charges: list(state.charges).map(item => { const charge = record(item); return { key: string(charge.key, 80), amount: integer(charge.amount, 1000000) } }),
    orders: list(state.orders, 2).map(item => {
      const order = record(item)
      if (order.region !== 'A' && order.region !== 'B') throw new Error('Unknown region.')
      return { id: string(order.id, 80), region: order.region }
    }),
    replicaOrders: list(state.replicaOrders, 2).map(item => string(item, 80)),
  }
}

export function validateSimInput(value: unknown, kind: LabKind): SimInput {
  const data = record(value)
  const action = string(data.action) as SimInput['action']
  const scenario = string(data.scenario) as SimInput['scenario']
  if (!actionsFor[kind].includes(action) || !scenariosFor[kind].includes(scenario)) throw new Error('Unsupported action or scenario for this lesson.')
  const lessonId = string(data.lessonId, 40)
  if (action === 'expire' && lessonId !== 'cache') throw new Error('Expiration is available in the cache lesson.')
  if (data.policy !== undefined && data.policy !== 'pause' && data.policy !== 'independent') throw new Error('Unknown partition policy.')
  const input: SimInput = { lessonId, action, scenario, policy: data.policy as SimInput['policy'] }
  if (data.state !== undefined) input.state = parseState(data.state)
  if (action === 'shorten') input.url = url(data.url)
  if (kind === 'payment') {
    input.key = string(data.key, 80)
    if (!/^[a-zA-Z0-9_-]+$/.test(input.key)) throw new Error('Invalid idempotency key.')
    input.amount = integer(data.amount, 1000000)
    if (!input.amount) throw new Error('The amount must be positive.')
  }
  return input
}
