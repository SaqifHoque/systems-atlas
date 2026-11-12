import type { ComponentId, LabKind } from './types'
export interface LabComponent { id: ComponentId; name: string; job: string; failure: string; reason: string; x: number; y: number }
export const components: LabComponent[] = [
  { id: 'browser', name: 'Browser', job: 'Turns a click into an HTTP request and renders the response.', failure: 'A connection can drop after a server has already completed the work.', reason: 'The product needs a place to show pending, success, and unknown outcomes.', x: 90, y: 90 },
  { id: 'api', name: 'API', job: 'Validates the request and coordinates the work behind a product action.', failure: 'It can time out, crash, or receive the same request again.', reason: 'It keeps business rules between the browser and the data stores.', x: 300, y: 90 },
  { id: 'database', name: 'Database', job: 'Stores durable mappings, notification records, or payment results.', failure: 'It can become unavailable or slow. A cache cannot replace its durable record.', reason: 'The API process can restart without losing the committed data.', x: 300, y: 285 },
  { id: 'cache', name: 'Cache', job: 'Keeps a temporary copy of a frequently read link destination.', failure: 'An entry can expire or become stale. A miss needs the database.', reason: 'It avoids repeated database reads for a popular link.', x: 510, y: 90 },
  { id: 'queue', name: 'Queue', job: 'Holds work until a worker can process and acknowledge it.', failure: 'Acknowledgments can be lost, so the same job can be delivered again.', reason: 'It lets work survive a temporary worker outage and absorbs bursts.', x: 510, y: 285 },
  { id: 'worker', name: 'Worker', job: 'Processes queued jobs and records which message IDs are finished.', failure: 'It can stop before acknowledgment. Real providers may require their own idempotency support.', reason: 'Slow delivery work does not need to block acceptance of a user request.', x: 510, y: 90 },
  { id: 'region-a', name: 'Region A · leader', job: 'Owns writes and coordinates the final inventory reservation.', failure: 'It can fail, or lose contact with the replica while still running.', reason: 'A single write owner makes one shared inventory decision easier to protect.', x: 90, y: 285 },
  { id: 'region-b', name: 'Region B · replica', job: 'Keeps confirmed copies, or accepts local writes under the independent policy.', failure: 'An isolated local view can accept a conflicting order. Failover requires a safe election.', reason: 'A remote copy can preserve confirmed orders when the original leader fails.', x: 510, y: 285 },
]
export function componentsFor(kind: LabKind, withCache: boolean) {
  const ids: ComponentId[] = kind === 'regions' ? ['browser', 'api', 'region-a', 'region-b']
    : kind === 'notifications' ? ['browser', 'api', 'database', 'queue', 'worker']
      : ['browser', 'api', 'database', ...(withCache ? ['cache' as const] : [])]
  return components.filter(item => ids.includes(item.id))
}
