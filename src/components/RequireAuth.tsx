import { useState, type ReactNode } from "react"
import { AuthModal } from "./AuthModal"
import { useAuthOptional } from "../state/auth"

export function RequireAuth({
  children,
  title,
  body,
}: {
  children: ReactNode
  title: string
  body: string
}) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const loading = auth?.loading ?? true
  const [authOpen, setAuthOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <span className="sr-only">Checking sign-in…</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-base-content/70">{body}</p>
        <button
          type="button"
          className="btn btn-primary rounded-full font-extrabold"
          onClick={() => setAuthOpen(true)}
        >
          Sign in
        </button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  return <>{children}</>
}
