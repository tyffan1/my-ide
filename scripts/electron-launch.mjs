import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electron from 'electron'

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env,
  cwd: rootDir,
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})
