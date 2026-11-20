import { createCast, deleteCast } from '../cast'
import { admin, testPublishableKey, testUrl } from './helpers'

// Signs the shared test cast in once, before any journey runs. Workers read
// their sessions from TEST_CAST; the returned function removes the cast after
// the last journey.
export default async function globalSetup() {
  const cast = await createCast(testUrl, testPublishableKey, admin)
  process.env.TEST_CAST = JSON.stringify(cast)
  return () => deleteCast(admin, cast)
}
