import { access, lstat, readdir, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'

export async function assertServerOutput(output) {
  try {
    await access(join(output, 'server/index.mjs'))
    await access(join(output, 'server/package.json'))
    await access(join(output, 'public/favicon.svg'))
  } catch {
    throw new Error('Missing Node server output. Run npm run build:server first.')
  }
  const root = await realpath(output)
  async function visit(directory) {
    for (const entry of await readdir(directory)) {
      const path = join(directory, entry)
      const stat = await lstat(path)
      if (stat.isSymbolicLink()) {
        const target = relative(root, await realpath(path))
        if (isAbsolute(target) || target === '..' || target.startsWith('../')) throw new Error(`Build contains an external symlink: ${relative(root, path)}`)
      } else if (stat.isDirectory()) await visit(path)
    }
  }
  await visit(root)
}
