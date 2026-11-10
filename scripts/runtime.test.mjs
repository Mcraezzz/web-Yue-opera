import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadEnvironment, springService } from './runtime.mjs'

test('environment preserves shell overrides and supports quoted values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'yueju-env-'))
  try {
    writeFileSync(join(dir, '.env'), 'SPRING_PORT=8080\nRAG_ENABLED=true\nLABEL="a # b"\n')
    const env = loadEnvironment(dir, { SPRING_PORT: '9080', RAG_ENABLED: 'false' })
    assert.equal(env.SPRING_PORT, '9080')
    assert.equal(env.RAG_ENABLED, 'false')
    assert.equal(env.LABEL, 'a # b')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('fresh checkout does not require RAG and Unix wrapper needs no executable bit', () => {
  assert.equal(loadEnvironment(tmpdir(), {}).RAG_ENABLED, 'false')
  assert.equal(springService('linux').command, 'sh')
  assert.deepEqual(springService('linux').args, ['./mvnw', 'spring-boot:run'])
})

function runSupervisor(services) {
  const moduleUrl = new URL('./runtime.mjs', import.meta.url).href
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { supervise } from ${JSON.stringify(moduleUrl)}; await supervise(${JSON.stringify(services)}, process.env)`],
  { encoding: 'utf8', timeout: 10000, windowsHide: true })
}

test('missing optional Python does not terminate the working backend', () => {
  const result = runSupervisor([
    { name: 'rag', command: 'yueju-nonexistent-python-test', args: [], optional: true },
    { name: 'backend', command: process.execPath, args: ['-e', 'setTimeout(() => console.log("BACKEND_ALIVE"), 250)'] },
  ])
  assert.ifError(result.error)
  assert.match(result.stdout, /BACKEND_ALIVE/)
  assert.match(result.stderr, /Local RAG is unavailable/)
  assert.equal(result.status, 1) // Required long-running service exiting stops the supervisor.
})

test('required startup failure terminates sibling services instead of hanging', () => {
  const result = runSupervisor([
    { name: 'backend', command: 'yueju-nonexistent-backend-test', args: [] },
    { name: 'frontend', command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] },
  ])
  assert.ifError(result.error)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /backend/)
})
