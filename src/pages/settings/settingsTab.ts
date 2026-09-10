export type SettingsTab = "profile" | "privacy" | "uploads" | "account"

export function parseSettingsTab(search: string): SettingsTab {
  const q = search.startsWith("?") ? search.slice(1) : search
  const tab = new URLSearchParams(q).get("tab")
  if (tab === "profile") return "profile"
  if (tab === "uploads") return "uploads"
  if (tab === "account") return "account"
  return "privacy"
}

export function settingsTabQuery(tab: SettingsTab): string {
  if (tab === "profile") return "?tab=profile"
  if (tab === "uploads") return "?tab=uploads"
  if (tab === "account") return "?tab=account"
  return "?tab=privacy"
}
