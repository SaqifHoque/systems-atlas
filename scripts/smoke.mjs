import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertServerOutput } from './lib/server-output.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
let directory, server
const terminate = () => server?.kill('SIGTERM')
process.once('SIGINT', terminate)
process.once('SIGTERM', terminate)
try {
  let base
  if (process.env.SMOKE_URL) {
    base = new URL(process.env.SMOKE_URL)
    assert.ok(['http:', 'https:'].includes(base.protocol), 'SMOKE_URL must use HTTP or HTTPS')
    assert.ok(!base.username && !base.password && !base.search && !base.hash, 'SMOKE_URL must not contain credentials, queries, or fragments')
    if (!base.pathname.endsWith('/')) base.pathname += '/'
  } else {
    const archive = join(root, 'artifacts/systems-atlas-server.tar.gz')
    const expected = (await readFile(`${archive}.sha256`, 'utf8')).trim().split(/\s+/)[0]
    const actual = createHash('sha256').update(await readFile(archive)).digest('hex')
    assert.equal(actual, expected, 'Server archive checksum mismatch')
    directory = await mkdtemp(join(tmpdir(), 'systems-atlas-release-'))
    execFileSync('tar', ['-xzf', archive, '-C', directory])
    await assertServerOutput(join(directory, '.output'))
    const env = { ...process.env, NODE_ENV: 'production', NITRO_HOST: '127.0.0.1', NITRO_PORT: '0', NUXT_APP_BASE_URL: '/' }
    delete env.NITRO_UNIX_SOCKET
    delete env.NITRO_SSL_CERT
    delete env.NITRO_SSL_KEY
    server = spawn(process.execPath, ['.output/server/index.mjs'], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let diagnostics = ''
    server.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-4000) })
    base = await new Promise((resolve, reject) => {
      let output = ''
      const timeout = setTimeout(() => reject(new Error('Packaged server startup timed out')), 20000)
      server.once('error', error => { clearTimeout(timeout); reject(error) })
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Packaged server exited (${code}): ${diagnostics}`)) })
      server.stdout.on('data', chunk => {
        output += chunk
        const match = output.match(/Listening on (http:\/\/127\.0\.0\.1:\d+)/)
        if (match) { clearTimeout(timeout); resolve(new URL(`${match[1]}/`)) }
      })
    })
  }

  async function get(path, options) {
    return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(10000) })
  }
  async function json(path, body) {
    const response = await get(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
    assert.equal(response.status, 200, `${path} must return 200`)
    return response.json()
  }
  assert.deepEqual(await json('api/health'), { status: 'ok', service: 'systems-atlas' })
  const page = await get('')
  assert.equal(page.status, 200)
  const html = await page.text()
  assert.ok(html.includes('Systems Atlas') && html.includes('<main'), 'SSR homepage is missing')
  const css = html.match(/<link[^>]+href="([^"]+\.css(?:\?[^"]*)?)"/)
  assert.ok(css, 'Built stylesheet is missing from the HTML')
  const stylesheet = await get(css[1])
  assert.equal(stylesheet.status, 200)
  assert.match(stylesheet.headers.get('content-type'), /text\/css/)
  assert.equal((await get('favicon.svg')).status, 200)
  const lessons = await json('api/lessons')
  assert.ok(lessons.length >= 8)
  assert.equal((await json('api/lessons/request')).id, 'request')
  assert.equal((await get('api/lessons/not-a-lesson')).status, 404)
  console.log('PASS: server renders the homepage, serves assets, and exposes lesson APIs.')

  const run = body => json('api/simulate', { scenario: 'normal', ...body })
  assert.equal((await run({ lessonId: 'request', action: 'load' })).result.title, 'Your collection is ready')
  const payment = { lessonId: 'payment', action: 'pay', key: 'release-check-001', amount: 4900 }
  const timeout = await run({ ...payment, scenario: 'timeout' })
  assert.equal(timeout.result.title, 'Payment status unknown')
  const retry = await run({ ...payment, state: timeout.state })
  assert.equal(retry.result.title, 'Order confirmed')
  assert.equal(retry.state.charges.length, 1)
  const pause = await run({ lessonId: 'partitions', action: 'pay', scenario: 'partition', policy: 'pause' })
  const independent = await run({ lessonId: 'partitions', action: 'pay', scenario: 'partition', policy: 'independent' })
  assert.equal(pause.state.orders.length, 0)
  assert.equal(independent.state.orders.length, 2)
  console.log('PASS: simulation API preserves same-key retries and both partition outcomes.')
} finally {
  process.removeListener('SIGINT', terminate)
  process.removeListener('SIGTERM', terminate)
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit')
    const force = setTimeout(() => server.kill('SIGKILL'), 3000)
    server.kill('SIGTERM')
    await exited
    clearTimeout(force)
  }
  if (directory) await rm(directory, { recursive: true, force: true })
}
