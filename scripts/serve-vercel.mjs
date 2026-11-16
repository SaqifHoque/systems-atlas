// Local verification harness for generated Nitro output, not a Vercel platform emulator.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertVercelOutput, dynamicRoute, functionForRoute, matches } from './lib/vercel-output.mjs'

process.env.NODE_ENV ??= 'production'
const output = resolve(process.env.VERCEL_OUTPUT_DIR || fileURLToPath(new URL('../.vercel/output/', import.meta.url)))
const config = await assertVercelOutput(output)
const staticRoot = join(output, 'static')
const handlers = new Map()
const mime = { '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.html': 'text/html', '.woff2': 'font/woff2' }

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (path.includes('\0')) { res.writeHead(400).end(); return }
    for (const route of config.routes) {
      if (route.continue && route.src && matches(route.src, path)) {
        for (const [name, value] of Object.entries(route.headers ?? {})) res.setHeader(name, value)
      }
    }
    const asset = resolve(staticRoot, `.${path}`)
    const within = relative(staticRoot, asset)
    if (isAbsolute(within) || within === '..' || within.startsWith('../')) { res.writeHead(400).end(); return }
    if (['GET', 'HEAD'].includes(req.method)) {
      const info = await stat(asset).catch(error => { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error })
      if (info?.isFile()) {
        res.setHeader('Content-Type', mime[extname(asset)] ?? 'application/octet-stream')
        res.end(req.method === 'HEAD' ? undefined : await readFile(asset))
        return
      }
    }
    const route = dynamicRoute(config, path)
    if (!route) { res.writeHead(404).end(); return }
    const file = await functionForRoute(output, route)
    if (!handlers.has(file)) handlers.set(file, import(pathToFileURL(file).href).then(module => module.default))
    await (await handlers.get(file))(req, res)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) res.writeHead(error instanceof URIError ? 400 : 500)
    res.end()
  }
})
server.listen(Number(process.env.NITRO_PORT || process.env.PORT || 3218), process.env.NITRO_HOST || '127.0.0.1', () => {
  const address = server.address()
  console.log(`Listening on http://127.0.0.1:${address.port}`)
})
function close() { server.close(() => process.exit(0)); server.closeIdleConnections() }
process.once('SIGTERM', close)
process.once('SIGINT', close)
