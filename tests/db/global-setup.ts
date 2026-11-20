import type { TestProject } from 'vitest/node'
import { createCast, deleteCast, type Cast } from '../cast'
import { admin, testUrl, testPublishableKey } from './helpers'

// Signs the shared test cast in once, before any database check runs, and
// hands their sessions to every test file.
export default async function setup(project: TestProject) {
  const cast = await createCast(testUrl, testPublishableKey, admin)
  project.provide('cast', cast)
  return () => deleteCast(admin, cast)
}

declare module 'vitest' {
  export interface ProvidedContext {
    cast: Cast
  }
}
