# Systems Atlas

An interactive system design learning app for people who have never designed a distributed system.

Learn by using realistic product screens, following requests through architecture diagrams, triggering failures, and predicting what happens next.

## Learning experience

- An interactive skill tree with visible prerequisites and a recommended next lesson.
- Original lessons and diagrams, written in plain English.
- Product simulations with step-by-step request tracing, replay, and component inspection.
- Prediction checkpoints with explanations and links to primary sources.
- Responsive layouts, keyboard navigation, and progress saved locally in the browser.

## Curriculum

- **Foundations:** Follow an HTTP request from browser to API to database and back. Understand latency and throughput.
- **Beginner:** Build a URL shortener, then explore cache hits, misses, and expired keys.
- **Intermediate:** Build a notification system with queues, retries, and duplicate delivery. Explore a checkout timeout and safe payment retries.
- **Advanced:** Explore replication, failover, and consistency in a multi-region checkout. Compare paused writes with independent regional writes during a network partition.

## Stack

One **Nuxt 4 and TypeScript** project using Vue components, interactive SVG, bundled lesson data, and Nitro routes under `server/api/` for deterministic simulations. Progress restores from `localStorage` after the client mounts.

The first release will run without accounts, a database, or external API keys. It will deploy as a Nuxt server application so its API routes work.

## Primary references

- [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Microsoft: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [AWS: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Development

Requires Node.js matching `.nvmrc` (22.23.4), or another version supported by `package.json`.

```sh
nvm use
npm ci
npm run dev
```

Open the local URL printed by Nuxt, usually `http://localhost:3000`.

```sh
npm run typecheck
npm run build:server
npm start
```

`npm start` runs the built Nuxt server. Configure its interface with `NITRO_HOST` and its port with `NITRO_PORT` when needed. A working server responds to `GET /api/health` with:

```json
{ "status": "ok", "service": "systems-atlas" }
```

## Project structure

- `app/app.vue` — shared application shell.
- `app/pages/` — the learning map and lesson reader.
- `app/components/` — accessible learning tree and preview.
- `app/composables/` — hydration-safe progress restoration.
- `shared/` — original curriculum, progression rules, and deterministic simulation models.
- `app/assets/css/main.css` — responsive application styles.
- `public/` — assets served as-is.
- `server/api/` — Nitro server routes.
- `nuxt.config.ts` — Nuxt configuration with strict TypeScript.

Nuxt generates the application, server, shared, and tooling TypeScript configurations in `.nuxt/`; the root `tsconfig.json` references these generated projects. `npm ci` runs `nuxt prepare` automatically.

## Deployment

Deploy as a Nuxt **server application**, with `npm ci` as the install command. For a generic Node host, use `npm run build:server` to explicitly select the Node server preset. For a Node.js host, start with `npm start`; Nitro creates `.output/server/index.mjs` and serves the bundled public assets. Ensure the hosting platform uses a compatible Node.js version.

For platforms with a dedicated Nitro adapter, use `npm run build` with that adapter rather than uploading the Node server output. Do not use a static export: `/api/health`, `/api/lessons`, and `/api/simulate` require a server.

For standalone server archives, container startup, CI checks, and rollback, see [the release runbook](docs/RELEASE.md).

## Learning map and interactive lessons

The home screen shows eight original lessons across four levels. Desktop uses an SVG prerequisite map; mobile uses a stacked roadmap with explicit prerequisite links. Select a lesson to see its goals, prerequisites, estimated time, and Start or Resume action. Advanced lessons are previewable, and their prerequisites link back to the map.

The recommendation follows prerequisite order and prioritizes an unfinished lesson already started. Each lesson pairs a usable product screen with an inspectable SVG architecture diagram, then explains the user experience, request path, and a design trade-off before a prediction checkpoint and a primary source. Correct predictions allow completion and reveal the next recommended lesson.

Progress is stored under `systems-atlas:progress:v1` only after the client mounts. Unknown IDs, malformed data, and completions without prerequisites are discarded during restore. If browser storage is blocked, progress still works in memory for the current visit. Clearing site storage resets the expedition. Progress is local to one browser, without cross-tab or cross-device synchronization.

`GET /api/lessons` returns the bundled curriculum. `GET /api/lessons/:id` returns one lesson or HTTP 404. No external service is called at runtime.

## Verification

```sh
npm test
npm run typecheck
npm run build:server
npm run package:server
npm run smoke
npx playwright install chromium
npm run test:e2e
```

The browser suite starts the production server on `127.0.0.1:3218`; leave that port available. It checks the learning journey and labs on desktop and an emulated mobile viewport: prerequisite navigation, keyboard activation, checkpoints, reload persistence, blocked storage, unknown IDs, cache outcomes, notification retries, payment idempotency, failover, and both partition policies. It uses Chromium for both viewport projects. Simulations are stepped manually in most tests to avoid wall-clock waits; a separate check verifies automatic request animation.

## Product labs

- **Request:** Load a book collection through browser → API → database. Trigger a database timeout and compare simulated latency with the normal flow. The throughput illustration assumes one sequential worker with no overhead.
- **Shortener:** Create a mapping using one API and database. The cache lesson adds cache-aside reads: a miss fills the cache, a hit skips the database, and an expired key refills from the durable mapping.
- **Notifications:** Commit a notification and outbox record, relay to a queue, and process a job. An offline worker leaves work queued. A lost acknowledgment causes redelivery; the processed-ID record prevents another visible message in this model.
- **Payment:** A response timeout leaves one recorded charge. Retry the same purchase with `checkout-atlas-001` to retrieve its recorded result. Inspect the charge count and trace; replay does not execute another request.
- **Regions:** Confirm a remote replica before acknowledging an order. A modeled safe failover recovers that order after the leader fails. During a partition, compare zero confirmed orders with paused writes against two accepted orders for one item with independent writes.

Every action uses `POST /api/simulate`, validated against the lesson’s supported actions and scenarios. It returns deterministic events with component-to-component edges, state snapshots, product outcomes, illustrative metrics, and explicit assumptions. Submitted URLs are parsed but never fetched or opened. No module-level mutable server state is used.

Desktop shows the product and architecture together. Mobile uses linked Product and Architecture tabs with arrow-key navigation. Pause, play, previous/next event, and replay all operate on the existing trace. Component buttons explain their job, failure mode, and design purpose. Reduced-motion preferences disable request packets and default to manual stepping.

Simulation state is ephemeral, supplied by the browser, and untrusted; it is not a real payment ledger or a production consistency implementation. A reload resets the lab while retaining lesson progress. Reset lab discards the current experiment. Regional scenario/policy changes begin a fresh comparison, except Leader fails retains the previously confirmed order for failover. Inputs and record counts are bounded; reset after reaching a limit.

Assumptions include atomic payment/result recording, atomic notification effect/deduplication in the toy consumer, and an external safe election/fencing decision for failover. Real delivery providers and replicated systems need those guarantees implemented explicitly. Simulated flow time sums illustrative event durations; animation pacing and background delivery time are separate from HTTP acceptance latency.

## Status

The app includes the prerequisite map, lesson previews, interactive product labs, animated request tracing, component inspection, normal and failure cases, prediction checkpoints, and saved learning progress. The release workflow checks standalone server packaging, browser journeys, automated accessibility, and container startup; hosting publication remains a separate release task. No accounts, database, external API keys, payments, or email delivery are required.
