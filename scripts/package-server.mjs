import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertServerOutput } from './lib/server-output.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
await assertServerOutput(join(root, '.output'))
const artifacts = join(root, 'artifacts')
await mkdir(artifacts, { recursive: true })
const name = 'systems-atlas-server.tar.gz'
const archive = join(artifacts, name)
execFileSync('tar', ['-czf', archive, '-C', root, '.output'])
const checksum = createHash('sha256').update(await readFile(archive)).digest('hex')
await writeFile(`${archive}.sha256`, `${checksum}  ${name}\n`)
console.log(`Packaged artifacts/${name} with a SHA-256 checksum.`)
