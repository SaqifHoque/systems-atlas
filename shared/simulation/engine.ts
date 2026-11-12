import type { Action, ComponentId, LabKind, ProductResult, Scenario, SimEvent, SimInput, SimState, Simulation } from './types'
import { initialSimState } from './types.ts'

// The state belongs to a disposable browser lab, never a real payment or database.
export function simulate(kind: LabKind, input: SimInput): Simulation {
  const state: SimState = structuredClone(input.state ?? initialSimState())
  const events: SimEvent[] = []
  let product: ProductResult = { title: 'Request in flight', detail: 'Follow the request in the diagram.', tone: 'neutral' }
  let browserProduct = { ...product }
  let failure = false
  const assumptions = ['All timings and counts are simulated. There are no external requests, real messages, or real charges.', 'State is supplied by this browser and discarded when the lesson reloads. It is not an authorization or payment system.']
  const show = (title: string, detail: string, tone: ProductResult['tone']) => { product = { title, detail, tone } }
  const event = (from: ComponentId, to: ComponentId, title: string, detail: string, duration = 20) => {
    if (to === 'browser') browserProduct = { ...product }
    events.push({ from, to, title, detail, duration, state: structuredClone(state), product: { ...browserProduct } })
  }
  if (state.clock >= 999 || (input.action === 'shorten' && state.links.length >= 50) || (input.action === 'send' && state.sequence >= 50)) {
    throw new Error('Lab limit reached. Reset the lab to continue.')
  }
  state.clock += 1

  if (kind === 'request') {
    assumptions.push('One request at a time: 20 ms to API, 60 ms for a database read, 20 ms back. Throughput illustration assumes one sequential worker and no other overhead.')
    event('browser', 'api', 'GET /collection', 'The browser asks the API for a collection of books.')
    if (input.scenario === 'database-down') {
      failure = true
      event('api', 'database', 'Database read times out', 'The API waits 200 ms and reaches this example’s timeout budget.', 200)
      show('Collection unavailable', 'The database did not respond. Try Load collection again after restoring the normal flow.', 'error')
      event('api', 'browser', '504 response', 'The API returns a visible failure instead of pretending that no books exist.')
    } else {
      event('api', 'database', 'Read saved books', 'The database returns two saved book records.', 60)
      show('Your collection is ready', 'The Design of Everyday Things · A Philosophy of Software Design', 'success')
      event('api', 'browser', '200 response', 'The browser renders the books from the response.')
    }
  }

  if (kind === 'shortener') {
    const withCache = input.lessonId === 'cache'
    assumptions.push('One API and one durable mapping store. Cache lessons add a cache-aside lookup; a cache entry lives for three logical actions. Creating links always writes to the database.', 'A miss reads the database and refills the cache. Expiration affects the cached copy only. URLs are parsed locally and are never opened or fetched.')
    event('browser', 'api', input.action === 'shorten' ? 'POST /links' : 'GET /s/:code', input.action === 'shorten' ? 'The API receives the long URL.' : 'The API looks up the most recently created link.')
    if (input.action === 'shorten') {
      if (input.scenario === 'database-down') {
        failure = true
        event('api', 'database', 'Write unavailable', 'No mapping is committed because the database is unavailable.', 60)
        show('Couldn’t create the link', 'Nothing was saved. Restore the normal flow and retry Shorten URL.', 'error')
      } else {
        const code = `atlas${state.links.length + 1}`
        state.links.push({ code, url: input.url ?? 'https://example.com/a-long-story' })
        event('api', 'database', 'Save the mapping', `${code} now maps to the original URL in the database.`, 60)
        show('Your link is ready', `atlas.test/s/${code}`, 'success')
      }
      event('api', 'browser', failure ? '503 response' : '201 response', product.detail)
    } else {
      const link = state.links.at(-1)
      if (!link) {
        show('Create a link first', 'There is no mapping to open yet.', 'warning')
        event('api', 'browser', '404 response', 'A code cannot redirect until it has a saved destination.')
      } else {
        if (input.action === 'expire' && withCache && state.cached) state.cached.expiresAt = state.clock
        const hit = withCache && state.cached?.code === link.code && state.cached.expiresAt > state.clock
        if (withCache) event('api', 'cache', hit ? 'Cache hit' : state.cached?.code === link.code ? 'Expired key' : 'Cache miss', hit ? 'A fresh copy of this mapping is available.' : 'There is no fresh cached copy. The mapping still lives in the database.', 5)
        if (!hit) {
          if (input.scenario === 'database-down') {
            failure = true
            event('api', 'database', 'Read unavailable', 'There is no fresh cache entry, and the database cannot answer.', 60)
          } else {
            event('api', 'database', 'Read the mapping', `The durable destination is ${link.url}.`, 60)
            if (withCache) {
              state.cached = { code: link.code, expiresAt: state.clock + 3 }
              event('api', 'cache', 'Refill the cache', 'The temporary copy expires after three logical actions.', 5)
            }
          }
        }
        show(failure ? 'Link temporarily unavailable' : 'Redirect ready', failure ? 'The saved link still exists. Retry when the database returns.' : `Destination: ${link.url}`, failure ? 'error' : 'success')
        event('api', 'browser', failure ? '503 response' : '302 redirect', failure ? 'The error appears in the product.' : 'A real browser would follow the Location header. This lab only displays the destination.')
      }
    }
  }

  if (kind === 'notifications') {
    assumptions.push('The notification and outbox record are committed atomically, and the relay eventually publishes them. This toy model treats delivery plus deduplication as atomic.', 'Real email providers may require their own idempotency mechanism. A durable processed-ID record must outlive retries; a queue alone does not guarantee exactly-once delivery.')
    event('browser', 'api', input.action === 'retry' ? 'Retry pending delivery' : 'POST /notifications', 'The product asks the API to accept background work.')
    let id: string | undefined
    if (input.action === 'send') {
      id = `message-${++state.sequence}`
      state.queued.push(id)
      event('api', 'database', 'Commit notification + outbox', `${id} is saved with an outbox record in one transaction.`, 40)
      event('database', 'queue', 'Relay publishes the job', 'The outbox relay eventually sends the committed event to the queue.')
    } else {
      id = state.queued[0]
      event('api', 'queue', 'Find pending job', id ? `Retry ${id}; do not generate another notification ID.` : 'No job is waiting.')
    }
    if (id && input.action === 'send') {
      show('Notification queued', `${id} is accepted, but not yet delivered.`, 'neutral')
      event('api', 'browser', '202 · queued', 'Acceptance is separate from the background delivery result.')
    }
    if (!id) {
      show('Nothing waiting', 'Send a notification before retrying.', 'neutral')
    } else if (input.scenario === 'worker-down') {
      failure = true
      show('Queued · worker offline', `${id} is safely waiting. Restore the normal flow and retry pending delivery.`, 'warning')
      event('queue', 'worker', 'Worker unavailable', 'The queue retains the unacknowledged job.', 40)
    } else {
      event('queue', 'worker', 'Deliver the job', `${id} may have been offered before.`)
      if (state.delivered.includes(id)) {
        event('worker', 'database', 'Duplicate suppressed', 'The processed-ID record says the effect is already complete. No second email is sent.', 10)
      } else {
        state.delivered.push(id)
        event('worker', 'database', 'Record the completed effect', `Send one email and store ${id} as processed.`, 40)
      }
      if (input.scenario === 'lost-ack') {
        failure = true
        show('Delivered · acknowledgment lost', 'The inbox has one new message, but the queue will offer the same ID again. Retry pending delivery.', 'warning')
        event('worker', 'queue', 'Acknowledgment lost', `${id} remains in the queue even though the effect happened.`)
      } else {
        state.queued = state.queued.filter(item => item !== id)
        show('Notification delivered', `${id} is acknowledged. The inbox contains ${state.delivered.length} unique message(s).`, 'success')
        event('worker', 'queue', 'Acknowledge the job', 'The queue removes the completed job.')
      }
    }
    event('browser', 'api', 'GET /notifications/status', 'A later status lookup asks whether the background work finished.')
    event('api', 'browser', 'Update delivery status', product.detail)
  }

  if (kind === 'payment') {
    const key = input.key ?? 'checkout-atlas-001'
    const amount = input.amount ?? 4900
    assumptions.push('One $49.00 checkout and a stable idempotency key. The modeled ledger stores the charge and its result atomically, with no key expiration during this lab.', 'Retries use the same key and amount. In production, persist keys, handle concurrent requests, and follow provider retention rules. A timeout is an unknown outcome, not proof of a declined charge.')
    event('browser', 'api', 'POST /payments', `Idempotency-Key: ${key}; amount: ${amount} cents.`)
    const prior = state.charges.find(charge => charge.key === key)
    if (prior && prior.amount !== amount) {
      failure = true
      show('Idempotency conflict', 'That key belongs to a different amount. No new charge was created.', 'error')
      event('api', 'database', 'Reject changed parameters', 'A key identifies one logical purchase, not arbitrary requests.', 10)
      event('api', 'browser', '409 response', product.detail)
    } else {
      if (prior) {
        event('api', 'database', 'Return recorded result', 'The key already exists in the ledger. Reuse the saved successful result; create zero new charges.', 10)
      } else {
        state.charges.push({ key, amount })
        event('api', 'database', 'Commit one charge', 'Record the charge and the result under this key in one atomic operation.', 60)
      }
      if (input.scenario === 'timeout') {
        failure = true
        show('Payment status unknown', 'The response timed out. The ledger has a charge. Retry with the same key to retrieve its result.', 'warning')
        event('api', 'browser', 'Response times out', 'The charge succeeded, but the browser did not receive confirmation.', 200)
      } else {
        show('Order confirmed', prior ? 'Recorded result returned. No second charge was created.' : 'Payment confirmed. Your order is on its way.', 'success')
        event('api', 'browser', '200 · payment confirmed', product.detail)
      }
    }
  }

  if (kind === 'regions') {
    assumptions.push('One inventory item, two regions, and at most two shopper decisions. Pause policy requires remote confirmation; independent policy accepts local writes.', 'Normal writes wait for the remote replica before acknowledgment. Failover assumes an external safe promotion decision and fencing of the former leader; a copy alone cannot safely elect itself.', 'Regional inventory conflict is separate from same-key payment deduplication: two different shoppers can create two different orders for the last item.')
    event('browser', 'api', 'POST /checkout', input.scenario === 'partition' ? 'Two shoppers in different regions each try to reserve the same last item.' : 'One item remains. The shopper asks to reserve it.')
    if (input.scenario === 'partition' && state.orders.length) {
      failure = true
      event('api', 'region-a', 'Inspect existing inventory', 'A previous checkout already used the item. This experiment does not reset accepted orders.', 40)
      show(state.orders.length > 1 ? 'Inventory conflict remains' : 'Item already reserved', 'Reset the lab to compare partition policies from one available item.', 'warning')
    } else if (input.scenario === 'partition') {
      failure = true
      event('api', 'region-a', 'Regions lose contact', 'Both regions are running, but the link between them is unavailable.', 40)
      if (input.policy === 'independent') {
        if (!state.orders.length) state.orders.push({ region: 'A', id: 'order-a' }, { region: 'B', id: 'order-b' })
        event('api', 'region-b', 'Both regions accept independently', 'Each local view says one item is available. Neither waits for the other.', 40)
        show('2 orders · 1 item', 'Both shoppers received confirmation. One order needs reconciliation after the link returns.', 'warning')
      } else {
        event('region-a', 'region-b', 'Cannot confirm the remote write', 'Remote confirmation is required; the network partition prevents it.', 200)
        show('Checkout paused', 'No new order was confirmed. Protecting a single shared decision reduces availability.', 'warning')
      }
    } else if (input.scenario === 'leader-down') {
      failure = true
      if (!state.orders.length || !state.replicaOrders.length) {
        event('api', 'region-a', 'Leader unavailable', 'The API cannot write to the leader. There is no confirmed replica order to recover.', 100)
        show('Writes paused', 'First run a normal checkout to establish a confirmed replica. Then trigger failover.', 'warning')
      } else {
        event('api', 'region-a', 'Leader unavailable · pause writes', 'A failure detector alone cannot safely authorize a new leader.', 100)
        state.promoted = true
        event('api', 'region-b', 'Safely promote the confirmed replica', 'Assume an external election fences the old leader. All previously acknowledged orders are present.', 120)
        show('Order recovered in Region B', 'The confirmed replica preserves the existing order. A retry returns it without accepting another order.', 'success')
      }
    } else if (state.orders.length) {
      event('api', state.promoted ? 'region-b' : 'region-a', 'Read existing order state', 'No new item is created by repeating the same checkout.', 40)
      show(state.orders.length > 1 ? 'Inventory conflict remains' : 'Order confirmed', state.orders.length > 1 ? 'Restoring the network does not undo accepted orders. Reset the lab to compare another policy from the same initial conditions.' : 'The existing order is returned.', state.orders.length > 1 ? 'warning' : 'success')
    } else {
      state.orders.push({ region: 'A', id: 'order-a' })
      event('api', 'region-a', 'Reserve the final item', 'The leader records one checkout order.', 40)
      state.replicaOrders.push('order-a')
      event('region-a', 'region-b', 'Replica confirms the write', 'Wait for the remote copy before acknowledging the order.', 100)
      show('Order confirmed', '1 order · 0 items left · confirmed in both regions.', 'success')
    }
    event('api', 'browser', 'Update checkout', product.detail)
  }

  return { state, events, result: product, metrics: { latency: events.reduce((sum, item) => sum + item.duration, 0), operations: events.length }, assumptions, failure }
}

export const scenariosFor: Record<LabKind, Scenario[]> = {
  request: ['normal', 'database-down'], shortener: ['normal', 'database-down'],
  notifications: ['normal', 'worker-down', 'lost-ack'], payment: ['normal', 'timeout'],
  regions: ['normal', 'leader-down', 'partition'],
}
export const actionsFor: Record<LabKind, Action[]> = {
  request: ['load'], shortener: ['shorten', 'open', 'expire'],
  notifications: ['send', 'retry'], payment: ['pay'], regions: ['pay'],
}
