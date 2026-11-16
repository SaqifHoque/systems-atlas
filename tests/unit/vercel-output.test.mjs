import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { assertVercelOutput, dynamicRoute } from '../../scripts/lib/vercel-output.mjs'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'atlas-output-test-'))
  const output = join(root, 'output')
  const functionRoot = join(output, 'functions/__fallback.func')
  await mkdir(functionRoot, { recursive: true })
  await mkdir(join(output, 'static'), { recursive: true })
  await writeFile(join(output, 'static/favicon.svg'), '<svg/>')
  await writeFile(join(functionRoot, 'index.mjs'), 'export default () => {}')
  const runtime = { runtime: 'nodejs22.x', handler: 'index.mjs' }
  const config = { version: 3, framework: { name: 'nuxt' }, routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/__fallback' }] }
  const save = () => Promise.all([
    writeFile(join(output, 'config.json'), JSON.stringify(config)),
    writeFile(join(functionRoot, '.vc-config.json'), JSON.stringify(runtime)),
  ])
  await save()
  return { root, output, runtime, config, save, cleanup: () => rm(root, { recursive: true, force: true }) }
}

test('Vercel output keeps SSR and API routes backed by an actual Node function', async () => {
  const f = await fixture()
  try {
    const config = await assertVercelOutput(f.output)
    assert.equal(dynamicRoute(config, '/api/simulate').dest, '/__fallback')
    assert.equal(dynamicRoute(config, '/lessons/request').dest, '/__fallback')
  } finally { await f.cleanup() }
})

test('static-only output or a missing API mapping fails validation', async () => {
  const f = await fixture()
  try {
    f.config.routes = [{ handle: 'filesystem' }]
    await f.save()
    await assert.rejects(assertVercelOutput(f.output), /dynamic route/)
    f.config.routes.push({ src: '/', dest: '/__fallback' })
    await f.save()
    await assert.rejects(assertVercelOutput(f.output), /dynamic route/)
  } finally { await f.cleanup() }
})

test('a runtime upgrade cannot silently bypass the Node major tested by CI', async () => {
  const f = await fixture()
  try {
    f.runtime.runtime = 'nodejs26.x'
    await f.save()
    await assert.rejects(assertVercelOutput(f.output), /Node 22/)
  } finally { await f.cleanup() }
})

test('a bundle cannot depend on files outside the deployable output', async () => {
  const f = await fixture()
  try {
    await writeFile(join(f.root, 'external.mjs'), 'export default 1')
    await symlink(join(f.root, 'external.mjs'), join(f.output, 'static/outside.mjs'))
    await assert.rejects(assertVercelOutput(f.output), /external symlink/)
  } finally { await f.cleanup() }
})
