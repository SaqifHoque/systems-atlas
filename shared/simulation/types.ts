export type LabKind = 'request' | 'shortener' | 'notifications' | 'payment' | 'regions'
export type Scenario = 'normal' | 'database-down' | 'worker-down' | 'lost-ack' | 'timeout' | 'leader-down' | 'partition'
export type Action = 'load' | 'shorten' | 'open' | 'expire' | 'send' | 'retry' | 'pay'
export type ComponentId = 'browser' | 'api' | 'database' | 'cache' | 'queue' | 'worker' | 'region-a' | 'region-b'

export interface SimState {
  clock: number
  links: { code: string; url: string }[]
  cached: { code: string; expiresAt: number } | null
  sequence: number
  queued: string[]
  delivered: string[]
  charges: { key: string; amount: number }[]
  orders: { region: 'A' | 'B'; id: string }[]
  replicaOrders: string[]
  promoted: boolean
}
export interface ProductResult {
  title: string
  detail: string
  tone: 'neutral' | 'success' | 'warning' | 'error'
}
export interface SimEvent {
  from: ComponentId
  to: ComponentId
  title: string
  detail: string
  duration: number
  state: SimState
  product: ProductResult
}
export interface SimInput {
  lessonId: string
  action: Action
  scenario: Scenario
  state?: SimState
  url?: string
  key?: string
  amount?: number
  policy?: 'pause' | 'independent'
}
export interface Simulation {
  state: SimState
  events: SimEvent[]
  result: ProductResult
  metrics: { latency: number; operations: number }
  assumptions: string[]
  failure: boolean
}
export const initialSimState = (): SimState => ({ clock: 0, links: [], cached: null, sequence: 0, queued: [], delivered: [], charges: [], orders: [], replicaOrders: [], promoted: false })
