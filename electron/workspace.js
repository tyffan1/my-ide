import fs from 'node:fs/promises'
import path from 'node:path'

const SKIP_DIRS = new Set([
  '.git',
  'dist',
  'node_modules',
  '.vite',
  'build',
  'out',
])

const TEXT_EXTENSIONS = new Set([
  'css',
  'html',
  'js',
  'json',
  'jsx',
  'md',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
])

const MAX_FILE_SIZE = 512 * 1024
const MAX_DEPTH = 10

function isTextFile(fileName) {
  const extension = path.extname(fileName).slice(1).toLowerCase()
  return TEXT_EXTENSIONS.has(extension)
}

export async function collectWorkspaceFiles(rootDir, currentDir = rootDir, depth = 0) {
  if (depth > MAX_DEPTH) {
    return []
  }

  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }

      files.push(...(await collectWorkspaceFiles(rootDir, fullPath, depth + 1)))
      continue
    }

    if (!entry.isFile() || !isTextFile(entry.name)) {
      continue
    }

    const stats = await fs.stat(fullPath)

    if (stats.size > MAX_FILE_SIZE) {
      continue
    }

    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/')
    const content = await fs.readFile(fullPath, 'utf8')

    files.push({
      path: relativePath,
      name: entry.name,
      content,
    })
  }

  files.sort((left, right) => left.path.localeCompare(right.path))
  return files
}
