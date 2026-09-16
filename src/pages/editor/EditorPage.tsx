import { useEffect } from "react"
import { AdminGuard } from "../../components/auth/AdminGuard"
import { useAuthOptional } from "../../state/auth"
import EditorLayout from "./EditorLayout"
import { EditorTeaser } from "./editorTeaser"

export function EditorPage() {
  const auth = useAuthOptional()

  // The editor is a fresh destination: navigating to it from a scrolled page
  // (Explore/wardrobe) should start at the top, not mid-document.
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    } catch {
      window.scrollTo(0, 0)
    }
    if (document.documentElement) document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0
  }, [])

  if (!auth?.user || !auth.isAdmin) return <EditorTeaser />

  return (
    <AdminGuard>
      <EditorLayout />
    </AdminGuard>
  )
}

export default EditorPage
