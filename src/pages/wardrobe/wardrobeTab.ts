export type WardrobeTab = "looks" | "pieces" | "uploads"

export function parseWardrobeTab(search: string): WardrobeTab {
  const q = search.startsWith("?") ? search.slice(1) : search
  const tab = new URLSearchParams(q).get("tab")
  if (tab === "pieces") return "pieces"
  if (tab === "uploads") return "uploads"
  return "looks"
}

export function wardrobeTabQuery(tab: WardrobeTab): string {
  if (tab === "pieces") return "?tab=pieces"
  if (tab === "uploads") return "?tab=uploads"
  return "?tab=looks"
}
