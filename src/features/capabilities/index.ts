// Public interface of the capabilities feature: whether the signed-in account
// holds a named capability, so a page knows which buttons to show. The
// database is what actually allows or refuses the action
// (supabase/migrations/20261118000018_capabilities.sql).
export { useCapability } from './useCapability'
export type { Capability } from './useCapability'
