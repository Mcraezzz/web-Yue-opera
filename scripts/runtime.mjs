import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

export const root = dirname(dirname(fileURLToPath(import.meta.url)))

export function loadEnvironment(directory = root, inherited = process.env) {
  const file = join(directory, '.env')
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}
  // Explicit shell/systemd settings always win over the local template.
  return { RAG_ENABLED: 'false', ...local, ...inherited }
}

export function springService(platform = process.platform) {
  const cwd = join(root, 'backend-spring')
  return platform === 'win32'
    ? { name: 'backend', command: 'cmd.exe', args: ['/d', '/s', '/c', 'mvnw.cmd spring-boot:run'], cwd }
    : { name: 'backend', command: 'sh', args: ['./mvnw', 'spring-boot:run'], cwd }
}

export async function supervise(services, env) {
  const children = []
  let stopping = false
  let finish
  const completed = new Promise(resolve => { finish = resolve })

  async function stop(code) {
    if (stopping) return
    stopping = true
    process.exitCode = code
    await Promise.all(children.map(async child => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
      if (process.platform === 'win32') {
        // Maven and cmd spawn descendants: terminate this task's process tree only.
        await new Promise(resolve => {
          const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
          killer.once('error', resolve)
          killer.once('exit', resolve)
        })
      } else {
        try { process.kill(-child.pid, 'SIGTERM') } catch { return }
        await new Promise(resolve => setTimeout(resolve, 500))
        try { process.kill(-child.pid, 'SIGKILL') } catch { /* already stopped */ }
      }
    }))
    process.removeListener('SIGINT', onInterrupt)
    process.removeListener('SIGTERM', onTerminate)
    finish()
  }

  const onInterrupt = () => { void stop(0) }
  const onTerminate = () => { void stop(0) }
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)

  for (const service of services) {
    const child = spawn(service.command, service.args, {
      cwd: service.cwd, env, stdio: 'inherit', windowsHide: true,
      detached: process.platform !== 'win32',
    })
    children.push(child)
    const failed = message => {
      if (stopping) return
      console.error(`[${service.name}] ${message}`)
      if (service.optional) {
        console.error('Local RAG is unavailable; the web and backend services remain running.')
      } else {
        void stop(1)
      }
    }
    child.once('error', error => failed(error.message))
    child.once('exit', (code, signal) => failed(`exited (${signal || code})`))
  }
  if (services.length === 0) await stop(0)
  await completed
}
