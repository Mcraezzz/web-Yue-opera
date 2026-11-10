import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { root, loadEnvironment, springService, supervise } from './runtime.mjs'

const env = loadEnvironment()
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
if (!existsSync(viteBin)) throw new Error('Vite is not installed. Run npm install first.')

const services = [
  springService(),
  { name: 'frontend', command: process.execPath, args: [viteBin], cwd: root },
]
if (env.RAG_ENABLED?.toLowerCase() === 'true') {
  services.push({
    name: 'rag', command: env.RAG_PYTHON || env.PYTHON || 'python',
    args: ['scripts/rag_service.py'], cwd: root, optional: true,
  })
} else {
  console.log('Local RAG is disabled. Set RAG_ENABLED=true after installing its dependencies and models.')
}
await supervise(services, env)
