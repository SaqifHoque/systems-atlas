# Releasing Systems Atlas

This release runs one stateless Nuxt server. Ship the entire `.output` directory, including its public assets and server dependencies. A static export cannot serve lesson or simulation API routes.

## Verify and package

Use the Node.js version in `.nvmrc` and the committed npm lockfile:

```sh
nvm use
npm ci
npm test
npm run typecheck
npm run build:server
npm run package:server
npm run smoke
npx playwright install chromium
npm run test:e2e
```

`build:server` explicitly selects Nitro's `node-server` preset, even if the build environment auto-detects another hosting provider. Keep `npm run build` for platforms that need their own Nitro adapter.

The package command checks the server entry point, public asset, and bundled dependency symlinks, then writes:

- `artifacts/systems-atlas-server.tar.gz` — the complete `.output` tree.
- `artifacts/systems-atlas-server.tar.gz.sha256` — its SHA-256 checksum.

The smoke test verifies the checksum, extracts that archive into a temporary directory, and starts the extracted server on an available loopback port. It checks server-rendered HTML, a stylesheet, favicon, health and lesson routes, a payment timeout followed by a same-key retry, and both partition outcomes. The process and extracted directory are cleaned up afterward. No source files or development dependencies are copied to the extracted directory.

Build archives on the target operating system and architecture if runtime dependencies include native code. CI builds the Node archive on Ubuntu; the Docker build creates its own Linux output. An archive checksum checks file integrity, not publisher identity.

## Run the verified Node artifact

Copy both artifact files to a fresh release directory. On Linux:

```sh
sha256sum --check systems-atlas-server.tar.gz.sha256
tar -xzf systems-atlas-server.tar.gz
NODE_ENV=production NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

On macOS, use `shasum -a 256 --check systems-atlas-server.tar.gz.sha256` for the checksum command. No runtime `npm install` is needed. From the source checkout, `npm start` defaults `NODE_ENV` to `production` and starts the same entry point.

| Variable | Use |
| --- | --- |
| `NODE_ENV=production` | Production behavior; set explicitly when invoking the artifact directly. |
| `NITRO_HOST` / `HOST` | Bind address. Use loopback behind a local proxy or `0.0.0.0` when the host/container must expose its listener. |
| `NITRO_PORT` / `PORT` | Listener port; defaults to 3000. |
| `NUXT_APP_BASE_URL` | Optional URL prefix when serving below a subpath. Keep the proxy and application prefix aligned. |

Put a production server behind an HTTPS reverse proxy or managed TLS endpoint. No account, database, external API key, email service, or payment provider is required.

## Container alternative

With Docker and Compose running:

```sh
docker compose up --build --detach --wait
```

Open `http://localhost:3000`. The multi-stage image installs/builds once, runs only `.output` as the unprivileged `node` user, and checks `/api/health`. The build context excludes local dependencies, environment files, Git data, and test artifacts. Compose enables an init process and binds the published port to loopback; public HTTPS exposure belongs to your hosting platform or reverse proxy.

Use `ATLAS_PORT=3219 docker compose up --build --detach --wait` to publish another local port. To check it from the source checkout:

```sh
SMOKE_URL=http://127.0.0.1:3219 npm run smoke
```

External smoke mode exercises the given app's public lesson and simulation endpoints without extracting or starting another server. It sends only toy simulation data. Use the application root URL, including any subpath. It rejects credentials, query strings, and fragments in the URL.

```sh
docker compose logs --follow
docker compose down
```

## CI and review

The `Verify release` workflow runs on pull requests and pushes to `main`. Actions are pinned to commit SHAs and use read-only repository permission. The application job installs from the lockfile, runs unit/type checks, builds and verifies the standalone archive, and runs desktop/mobile browser tests. It retains the server archive only after the checks pass, with reports and failure traces available for seven days.

A second job builds the Docker image, waits for its health check, and runs the same HTTP smoke checks against it. It always stops the container. This workflow verifies and packages; it does not publish a website, push a container image, create a Git tag, or configure branch protection.

Before shipping, review the exact commit and both CI jobs. Automated WCAG A/AA scans catch common issues in the map, preview, product, architecture tab, and answered-checkpoint states. They complement the keyboard/browser tests; they do not certify full accessibility or replace manual assistive-technology testing. Mobile tests use Chromium emulation rather than Safari.

## Rollback and operating checks

Keep the previous verified artifact and checksum. To roll back, stop or drain the current instance and start the previous artifact with the same host settings, or restore the previous image in the hosting platform. This app has no database migrations or server-side learner records to reverse.

- `/api/health` should return HTTP 200 and `{ "status": "ok", "service": "systems-atlas" }`.
- `/api/lessons` should return the bundled curriculum as JSON.
- Check that `/_nuxt/` assets load and a product action reaches `/api/simulate` after deployment.
- Inspect the server's stdout/stderr when a check fails. A missing `.output/public` or a static-only deployment can leave HTML working while breaking assets or APIs.

Learning progress belongs to the browser's origin, so switching hostnames or protocols creates a separate local history. Reloading resets disposable simulation state while retaining lesson completion. Timings, ledger records, notifications, replication, and failover remain explicit teaching models; they are not real infrastructure guarantees.

References: [Nuxt Node server deployment](https://nuxt.com/docs/4.x/getting-started/deployment), [Playwright CI](https://playwright.dev/docs/ci-intro), and [automated accessibility testing](https://playwright.dev/docs/accessibility-testing).
