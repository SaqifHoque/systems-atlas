import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { assertVercelOutput } from './lib/vercel-output.mjs'

const root = new URL('../', import.meta.url)
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'))
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
assert.equal(config.framework, 'nuxtjs')
assert.equal(config.buildCommand, 'npm run build:vercel')
assert.equal(config.installCommand, 'npm ci')
assert.equal(pkg.engines.node, '>=22.22.3 <23')
assert.equal(config.outputDirectory, undefined, 'Do not replace the generated function output with a static directory')
assert.equal(config.rewrites, undefined, 'Use Nitro’s generated routes, not SPA catch-all rewrites')
await assertVercelOutput(fileURLToPath(new URL('.vercel/output/', root)))
console.log('PASS: Vercel configuration, Node 22 functions, SSR/API routes, static assets, and bundled dependencies.')
