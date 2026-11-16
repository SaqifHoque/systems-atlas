# Systems Atlas on Vercel

The repository is configured for a Nuxt server deployment. `vercel.json` selects the Nuxt framework, installs with `npm ci`, and builds with `npm run build:vercel`. Nitro creates Vercel Build Output API v3 files in `.vercel/output`, including static assets and Node functions for the pages and API routes.

The Node engine is restricted to the tested Node 22 major, with Nuxt's minimum patch requirement. Vercel uses `package.json` to choose the Node major; `.nvmrc` alone does not control its functions. Keep local development, CI, Docker, and Vercel on the same major.

## Verify the adapter before connecting hosting

```sh
nvm use
npm ci
npm test
npm run typecheck
npm run build:vercel
npm run check:vercel
npm run smoke:vercel
npx playwright install chromium
ATLAS_TEST_TARGET=vercel npm run test:e2e
```

The output check verifies the generated function runtime, actual handler files, SSR and API routing, static-asset fallback order, and dependency containment. It rejects a static-only output or a function bundle that depends on files outside the generated output.

The smoke test copies the generated output into a temporary directory, preserves internal symlinks, and invokes its actual Nitro handlers through a local Node HTTP harness. It exercises HTML, CSS, lesson APIs, payment idempotency, and the partition comparison. Browser tests use the same generated route/function mapping, not the standalone Node build.

This checks application behavior and artifact integrity. The harness does not reproduce Vercel's CDN, deployment protection, regional infrastructure, cold starts, or platform limits. The credential-free CI job does not create a Vercel project or publish a deployment.

## Connect the repository after review

After merging this PR, import `SaqifHoque/systems-atlas` into the intended Vercel account/team:

| Setting | Value |
| --- | --- |
| Framework | Nuxt |
| Root directory | Repository root |
| Install command | `npm ci` |
| Build command | `npm run build:vercel` |
| Output directory override | Leave unset |
| Node major | 22.x, aligned with `package.json` |
| Production branch | `main` |
| App environment variables | None required |

The committed configuration provides the install/build settings. Do not override the output directory with `.output/public`, `dist`, or a generated static site, and do not add an SPA rewrite: Nitro's generated routes serve both SSR and `/api/` endpoints.

Use Vercel's Git integration for branch previews and main deployments. The existing GitHub workflow verifies the application, container, and Vercel adapter; it does not upload source or deploy from CI, and it needs no Vercel token. No project/team IDs or `.vercel/project.json` are committed.

Review the exact commit and verification checks before releasing it. Importing the repository can trigger a deployment, and subsequent main pushes follow the project's Git deployment settings. This setup PR supplies configuration and verification, not a hosted URL.

## Verify a hosted deployment

For a deployment URL you can access:

```sh
SMOKE_URL=https://your-deployment.vercel.app npm run smoke
PLAYWRIGHT_BASE_URL=https://your-deployment.vercel.app npm run test:e2e
```

Replace the example hostname with the URL Vercel returns. External browser mode uses that origin and does not start a local server. It rejects URLs containing credentials, queries, fragments, or subpaths. The tests send only disposable simulation inputs; they do not trigger real payments or email.

A protected preview can return a Vercel login page or 401/403 before the application runs. Use authorized Vercel access for that deployment rather than interpreting the protection page as an application failure. The test commands do not implement an authentication or protection bypass.

Confirm that:

- `/` renders the learning tree and `/_nuxt/` assets load.
- `/api/health` returns the expected health JSON.
- `/api/lessons` and `/api/lessons/request` return curriculum data.
- A payment response timeout followed by the same-key retry leaves one charge.
- A checkpoint completion survives reload on the deployed origin.

Learning progress is browser-local and origin-specific, so a preview URL has a different history from production. The product labs remain simulations; the regions depicted in a lesson do not describe the physical Vercel deployment.

## Production and rollback

Treat previews as preview verification. Production promotion uses the chosen Vercel project's production deployment process and environment settings. A fresh production build may differ from a preview build, so verify the resulting production URL with the smoke checks as well.

Use the project's deployment history to restore a previously verified production deployment when necessary. Hosting-side deployment checks, branch protection, promotion, domain setup, and rollback are account operations outside this PR. Never add a deployment token to repository files.

The standalone `npm run build:server`, release archive, and Docker workflows remain available. See [the release runbook](RELEASE.md) for those paths.

References: [Nuxt on Vercel](https://vercel.com/docs/frameworks/full-stack/nuxt), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), and [Git deployments](https://vercel.com/docs/deployments/git).
