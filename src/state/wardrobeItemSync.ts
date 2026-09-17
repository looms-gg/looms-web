import { supabase } from "../lib/supabase"
import { formatErrorMessage } from "../lib/errorFormat"

export type WardrobeRowStatus = "ok" | "dup" | "fail"

export async function fetchCloudWardrobeGarmentIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("wardrobe_items")
    .select("garment_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => row.garment_id)
}

export async function insertCloudWardrobeItem(
  userId: string,
  garmentId: string,
): Promise<{ status: WardrobeRowStatus; errorMessage?: string }> {
  const { error } = await supabase
    .from("wardrobe_items")
    .insert({ user_id: userId, garment_id: garmentId })
  if (!error) return { status: "ok" }
  const code = (error as { code?: string }).code
  if (code === "23505") return { status: "dup" }
  return { status: "fail", errorMessage: formatErrorMessage(error) }
}

export async function deleteCloudWardrobeItem(
  userId: string,
  garmentId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("wardrobe_items")
    .delete()
    .eq("user_id", userId)
    .eq("garment_id", garmentId)
  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

