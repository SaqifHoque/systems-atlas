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

## Planned stack

One **Nuxt 4 and TypeScript** project using Vue components, interactive SVG, bundled lesson data, and Nitro routes under `server/api/` for deterministic simulations. Progress restores from `localStorage` after the client mounts.

The first release will run without accounts, a database, or external API keys. It will deploy as a Nuxt server application so its API routes work.

## Primary references

- [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Microsoft: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [AWS: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Status

Initial project documentation only. Implementation has not started.
