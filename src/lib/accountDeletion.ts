import { formatErrorMessage } from "./errorFormat"
import { supabase } from "./supabase"

/**
 * Deletes the caller's profile row via the delete_my_account RPC. Cascades
 * remove all user content. Returns null on success or a displayable Error.
 */
export async function requestAccountDeletion(): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("delete_my_account")
  if (error) return { error: new Error(formatErrorMessage(error)) }
  return { error: null }
}
