import assert from 'node:assert/strict'
import { access, readFile, realpath } from 'node:fs/promises'
import { join, relative, isAbsolute } from 'node:path'
import { assertInternalSymlinks } from './server-output.mjs'

export const requiredPaths = ['/', '/lessons/request', '/api/health', '/api/lessons', '/api/lessons/request', '/api/simulate', '/unknown-route']
export const matches = (source, path) => new RegExp(`^(?:${source})$`).test(path)
export function dynamicRoute(config, path) {
  return config.routes.find(route => !route.handle && !route.continue && route.src && matches(route.src, path))
}

export async function functionForRoute(output, route) {
  assert.ok(route?.dest?.startsWith('/'), 'A dynamic route must target a function')
  const directory = join(output, 'functions', `${route.dest.split('?')[0].slice(1)}.func`)
  const root = await realpath(output)
  const target = relative(root, await realpath(directory))
  assert.ok(!isAbsolute(target) && target !== '..' && !target.startsWith('../'), 'Function destination must stay inside the generated output')
  const config = JSON.parse(await readFile(join(directory, '.vc-config.json'), 'utf8'))
  assert.equal(config.runtime, 'nodejs22.x', 'Vercel functions must use the tested Node 22 runtime')
  assert.equal(config.handler, 'index.mjs', 'Expected Nitro’s Node request handler')
  await access(join(directory, config.handler))
  return join(directory, config.handler)
}

export async function assertVercelOutput(output) {
  const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'))
  assert.equal(config.version, 3, 'Expected Vercel Build Output API v3')
  assert.equal(config.framework?.name, 'nuxt')
  assert.ok(Array.isArray(config.routes), 'Expected Nitro routing rules')
  const filesystem = config.routes.findIndex(route => route.handle === 'filesystem')
  assert.ok(filesystem >= 0, 'Static assets must have a filesystem route')
  assert.ok(config.routes.slice(0, filesystem).every(route => route.continue), 'Do not shadow the generated static asset route')
  const dynamic = { ...config, routes: config.routes.slice(filesystem + 1) }
  for (const path of requiredPaths) await functionForRoute(output, dynamicRoute(dynamic, path))
  await access(join(output, 'static/favicon.svg'))
  await assertInternalSymlinks(output)
  return config
}
