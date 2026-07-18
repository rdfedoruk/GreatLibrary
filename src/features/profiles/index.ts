// Public interface of the profiles feature. Other features and the app
// shell import from here only — never from files inside this folder.
export { ProfilePage } from './ProfilePage'
export { fetchProfileBySlug, fetchOwnProfile } from './api'
export type { Profile, ProfileType } from './api'
