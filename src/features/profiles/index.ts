// Public interface of the profiles feature. Other features and the app
// shell import from here only — never from files inside this folder.
export { ProfilePage } from './ProfilePage'
export { SuggestedProfiles } from './SuggestedProfiles'
export {
  fetchProfileBySlug,
  fetchOwnProfile,
  searchProfiles,
  createUnclaimedProfile,
  fetchSuggestedProfiles,
} from './api'
export type {
  Profile,
  ProfileType,
  ProfileStatus,
  ProfileSearchResult,
  SuggestedProfile,
} from './api'
