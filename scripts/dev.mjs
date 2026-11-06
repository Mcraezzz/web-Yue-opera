import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const springDir = join(root, 'backend-spring')
const springMvnw = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw'
const env = loadEnv(join(root, '.env'))
const pythonBin = process.env.RAG_PYTHON || env.RAG_PYTHON || process.env.PYTHON || 'python'

if (!existsSync(viteBin)) {
  console.error('Vite is not installed. Run npm install first.')
  process.exit(1)
}

const children = [
  spawn(pythonBin, ['scripts/rag_service.py'], {
    cwd: root,
    env: { ...process.env, ...env, RAG_PORT: process.env.RAG_PORT || env.RAG_PORT || '8091' },
    stdio: 'inherit',
  }),
  existsSync(join(springDir, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw')) && spawn(
    process.platform === 'win32' ? 'cmd.exe' : springMvnw,
    process.platform === 'win32'
      ? ['/c', springMvnw, 'spring-boot:run']
      : ['spring-boot:run'],
    {
      cwd: springDir,
      env: { ...process.env, ...env, SPRING_PORT: process.env.SPRING_PORT || env.SPRING_PORT || '8080' },
      stdio: 'inherit',
    }
  ),
  spawn(process.execPath, [viteBin], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  }),
].filter(Boolean)

const shutdown = (code = 0) => {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) shutdown(code)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {}

  const env = {}
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}
