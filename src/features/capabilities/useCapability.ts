import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/** Every capability the database knows about. */
export type Capability = 'delete_entries'

/**
 * True once the database confirms the signed-in account holds this
 * capability; false while checking, when signed out, or on any error.
 */
export function useCapability(
  capability: Capability,
  currentUserId: string | null,
): boolean {
  const [holds, setHolds] = useState(false)

  useEffect(() => {
    setHolds(false)
    if (currentUserId === null) return
    let cancelled = false
    supabase
      .from('capability_grants')
      .select('capability')
      .eq('user_id', currentUserId)
      .eq('capability', capability)
      .then(({ data }) => {
        if (!cancelled) setHolds((data ?? []).length > 0)
      })
    return () => {
      cancelled = true
    }
  }, [capability, currentUserId])

  return holds
}
