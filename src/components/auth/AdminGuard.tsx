import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck, ArrowLeft } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { useAuth } from "../../state/auth"
import { isAdmin } from "../../lib/admin"

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!user || !isAdmin(user.id)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-5">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-error/10 text-error">
          <Icon icon={ShieldCheck} size="xl" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Access Restricted</h1>
          <p className="text-sm text-base-content/70">
            The looms admin panel is restricted to verified platform administrators.
          </p>
        </div>
        <div>
          <Link to="/" className="btn btn-primary btn-sm rounded-full font-extrabold gap-2">
            <Icon icon={ArrowLeft} size="xs" />
            Back to Explore
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
