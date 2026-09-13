import { supabase } from "../lib/supabase"
import { lookRowToLook, lookPersistFields } from "./lookMeta"
import type { Look, LookVisibility } from "./persist"

/**
 * Cloud look sync for the wardrobe provider: the network half of hydration
 * and look writes lives here so wardrobe.tsx keeps context wiring, local
 * persistence, and notice UX only — mirroring how mutations live in
 * wardrobeActions.ts.
 */

/** Fetch every look row for a user, mapped into the local Look shape. */
export async function fetchCloudLooks(userId: string): Promise<Look[]> {
  const { data, error } = await supabase
    .from("looks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(lookRowToLook)
}

/** Persist a newly saved look. */
export function insertCloudLook(look: Look, ownerId: string) {
  return supabase.from("looks").insert({
    id: look.id,
    user_id: ownerId,
    ...lookPersistFields(look),
  })
}

/** Overwrite a look's gameplay fields (save-over). */
export function updateCloudLook(look: Look, id: string, ownerId: string) {
  return supabase
    .from("looks")
    .update({
      ...lookPersistFields(look),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", ownerId)
}

/** Update only the user-editable meta columns (rename, description, visibility). */
export function updateCloudLookMeta(
  id: string,
  ownerId: string,
  fields: { name: string; description: string; visibility: LookVisibility },
) {
  return supabase
    .from("looks")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ownerId)
}
