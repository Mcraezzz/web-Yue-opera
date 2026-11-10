import { loadEnvironment, springService, supervise } from './runtime.mjs'

await supervise([springService()], loadEnvironment())
