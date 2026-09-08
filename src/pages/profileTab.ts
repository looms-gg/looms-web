export type ProfileTab = "uploads" | "looks" | "liked"

export function parseProfileTab(search: string): ProfileTab {
  const q = search.startsWith("?") ? search.slice(1) : search
  const tab = new URLSearchParams(q).get("tab")
  if (tab === "looks") return "looks"
  if (tab === "liked") return "liked"
  return "uploads"
}

export function profileTabQuery(tab: ProfileTab): string {
  if (tab === "looks") return "?tab=looks"
  if (tab === "liked") return "?tab=liked"
  return "?tab=uploads"
}
