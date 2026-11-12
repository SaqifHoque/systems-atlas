import test from 'node:test'
import assert from 'node:assert/strict'
import { simulate } from '../../shared/simulation/engine.ts'
import { initialSimState } from '../../shared/simulation/types.ts'
import { validateSimInput } from '../../shared/simulation/validate.ts'

const input = (lessonId, action, scenario = 'normal', state = initialSimState(), extra = {}) => ({ lessonId, action, scenario, state, ...extra })
const has = (simulation, title) => simulation.events.some(event => event.title === title)

test('request flow is deterministic, snapshots do not alias, and timeout reaches product', () => {
  const body = input('request', 'load')
  const original = structuredClone(body)
  const normal = simulate('request', body)
  assert.deepEqual(normal, simulate('request', body))
  assert.deepEqual(body, original)
  assert.equal(normal.metrics.latency, 100)
  assert.equal(normal.result.tone, 'success')
  assert.notEqual(normal.events[0].state, normal.events[1].state)
  const failure = simulate('request', input('request', 'load', 'database-down'))
  assert.equal(failure.metrics.latency, 240)
  assert.equal(failure.result.title, 'Collection unavailable')
  assert.ok(failure.failure)
})

test('URL shortener starts without a cache, then models miss, hit, expiry, and outage', () => {
  const created = simulate('shortener', input('shortener', 'shorten', 'normal', undefined, { url: 'https://example.com/story' }))
  assert.equal(created.state.links.length, 1)
  assert.equal(created.state.cached, null)
  assert.ok(!created.events.some(event => event.to === 'cache'))
  const miss = simulate('shortener', input('cache', 'open', 'normal', created.state))
  assert.ok(has(miss, 'Cache miss'))
  assert.ok(has(miss, 'Refill the cache'))
  const hit = simulate('shortener', input('cache', 'open', 'database-down', miss.state))
  assert.ok(has(hit, 'Cache hit'))
  assert.ok(!hit.events.some(event => event.to === 'database'))
  assert.equal(hit.result.tone, 'success')
  const expired = simulate('shortener', input('cache', 'expire', 'normal', hit.state))
  assert.ok(has(expired, 'Expired key'))
  assert.equal(expired.state.links.length, 1)
  assert.ok(expired.state.cached.expiresAt > expired.state.clock)
  const down = simulate('shortener', input('cache', 'expire', 'database-down', expired.state))
  assert.equal(down.result.tone, 'error')
  assert.equal(down.state.links.length, 1)
  const failedWrite = simulate('shortener', input('shortener', 'shorten', 'database-down', undefined, { url: 'https://example.com/story' }))
  assert.equal(failedWrite.state.links.length, 0)
})

test('natural cache expiry follows logical actions rather than wall-clock sleep', () => {
  let state = simulate('shortener', input('cache', 'shorten', 'normal', undefined, { url: 'https://example.com' })).state
  state = simulate('shortener', input('cache', 'open', 'normal', state)).state
  state = simulate('shortener', input('cache', 'open', 'normal', state)).state
  state = simulate('shortener', input('cache', 'open', 'normal', state)).state
  const expiry = simulate('shortener', input('cache', 'open', 'normal', state))
  assert.ok(has(expiry, 'Expired key'))
})

test('offline worker retains jobs, and lost acknowledgment retries suppress the duplicate effect', () => {
  const queued = simulate('notifications', input('queues', 'send', 'worker-down'))
  assert.equal(queued.state.queued.length, 1)
  assert.equal(queued.state.delivered.length, 0)
  assert.ok(has(queued, '202 · queued'))
  assert.equal(queued.events.find(event => event.title === 'GET /notifications/status').product.title, 'Notification queued')
  const delivered = simulate('notifications', input('queues', 'retry', 'normal', queued.state))
  assert.equal(delivered.state.queued.length, 0)
  assert.equal(delivered.state.delivered.length, 1)
  const ackLost = simulate('notifications', input('retries', 'send', 'lost-ack'))
  assert.equal(ackLost.state.queued.length, 1)
  assert.equal(ackLost.state.delivered.length, 1)
  const retried = simulate('notifications', input('retries', 'retry', 'normal', ackLost.state))
  assert.ok(has(retried, 'Duplicate suppressed'))
  assert.deepEqual(retried.state.delivered, ['message-1'])
  assert.equal(retried.state.queued.length, 0)
})

test('payment timeout preserves a recorded charge and same-key retries retrieve its result', () => {
  const details = { key: 'checkout-atlas-001', amount: 4900 }
  const timeout = simulate('payment', input('payment', 'pay', 'timeout', undefined, details))
  assert.equal(timeout.result.title, 'Payment status unknown')
  assert.equal(timeout.state.charges.length, 1)
  assert.equal(timeout.events.find(event => event.title === 'Commit one charge').product.title, 'Request in flight')
  const retry = simulate('payment', input('payment', 'pay', 'normal', timeout.state, details))
  assert.ok(has(retry, 'Return recorded result'))
  assert.deepEqual(retry.state.charges, timeout.state.charges)
  assert.equal(retry.result.title, 'Order confirmed')
  const conflict = simulate('payment', input('payment', 'pay', 'normal', retry.state, { ...details, amount: 5900 }))
  assert.equal(conflict.result.title, 'Idempotency conflict')
  assert.equal(conflict.state.charges.length, 1)
  const separatePurchase = simulate('payment', input('payment', 'pay', 'normal', retry.state, { ...details, key: 'different-purchase' }))
  assert.equal(separatePurchase.state.charges.length, 2)
  assert.equal(simulate('payment', input('payment', 'pay', 'normal', undefined, details)).state.charges.length, 1)
})

test('synchronous confirmation preserves an order through modeled safe failover', () => {
  const normal = simulate('regions', input('replication', 'pay'))
  assert.deepEqual(normal.state.replicaOrders, ['order-a'])
  const failed = simulate('regions', input('replication', 'pay', 'leader-down', normal.state))
  assert.ok(has(failed, 'Leader unavailable · pause writes'))
  assert.ok(failed.state.promoted)
  assert.equal(failed.state.orders.length, 1)
  assert.equal(failed.result.title, 'Order recovered in Region B')
  const noCopy = simulate('regions', input('replication', 'pay', 'leader-down'))
  assert.equal(noCopy.result.title, 'Writes paused')
  assert.equal(noCopy.state.orders.length, 0)
})

test('partition policies expose different outcomes and do not erase existing orders', () => {
  const paused = simulate('regions', input('partitions', 'pay', 'partition', undefined, { policy: 'pause' }))
  assert.equal(paused.state.orders.length, 0)
  assert.equal(paused.result.title, 'Checkout paused')
  const independent = simulate('regions', input('partitions', 'pay', 'partition', undefined, { policy: 'independent' }))
  assert.equal(independent.state.orders.length, 2)
  assert.equal(independent.state.replicaOrders.length, 0)
  const recovered = simulate('regions', input('partitions', 'pay', 'normal', independent.state))
  assert.equal(recovered.result.title, 'Inventory conflict remains')
  assert.equal(recovered.state.orders.length, 2)
  const repeated = simulate('regions', input('partitions', 'pay', 'partition', independent.state, { policy: 'independent' }))
  assert.equal(repeated.state.orders.length, 2)
})

test('validation rejects malformed state, unsafe URLs, and incompatible actions', () => {
  for (const body of [null, [], {}, input('request', 'send'), input('request', 'load', 'partition')]) {
    assert.throws(() => validateSimInput(body, 'request'))
  }
  for (const url of ['javascript:alert(1)', 'not a URL', 'https://user:password@example.com']) {
    assert.throws(() => validateSimInput(input('shortener', 'shorten', 'normal', undefined, { url }), 'shortener'))
  }
  assert.throws(() => validateSimInput(input('shortener', 'expire'), 'shortener'))
  assert.throws(() => validateSimInput(input('request', 'load', 'normal', { clock: -1 }), 'request'))
  const body = input('payment', 'pay', 'normal', undefined, { key: 'checkout-1', amount: 4900 })
  assert.deepEqual(validateSimInput(body, 'payment'), { ...body, policy: undefined })
})
