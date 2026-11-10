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
npm run build
npm start
```

`npm start` runs the built Nuxt server. Configure its interface with `NITRO_HOST` and its port with `NITRO_PORT` when needed. A working server responds to `GET /api/health` with:

```json
{ "status": "ok", "service": "systems-atlas" }
```

## Project structure

- `app/app.vue` — branded starter screen.
- `app/assets/css/main.css` — responsive application styles.
- `public/` — assets served as-is.
- `server/api/` — Nitro server routes.
- `nuxt.config.ts` — Nuxt configuration with strict TypeScript.

Nuxt generates the application, server, shared, and tooling TypeScript configurations in `.nuxt/`; the root `tsconfig.json` references these generated projects. `npm ci` runs `nuxt prepare` automatically.

## Deployment

Deploy as a Nuxt **server application**, with `npm ci` as the install command and `npm run build` as the build command. For a Node.js host, start with `npm start`; Nitro creates `.output/server/index.mjs` and serves the bundled public assets. Ensure the hosting platform uses a compatible Node.js version.

For platforms with a dedicated Nitro adapter, use that adapter rather than uploading the Node server output. Do not use a static export: `/api/health` and future lesson and simulation routes require a server.

## Status

The Nuxt 4 and TypeScript scaffold includes a responsive starter screen and a server health endpoint. The curriculum, skill tree, learning simulations, checkpoints, and progress storage are planned and are not implemented in this setup PR.
