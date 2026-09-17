import { supabase } from "../supabase"

/**
 * Deletes the caller's profile row via the delete_my_account RPC. Cascades
 * remove all user content. Returns null on success or the raw Error.
 */
export async function requestAccountDeletion(): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("delete_my_account")
  if (error) {
    const message = (error as { message?: string }).message || "Failed to delete account"
    return {
      error: error instanceof Error ? error : new Error(message),
    }
  }
  return { error: null }
}
