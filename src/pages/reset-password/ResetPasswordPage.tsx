import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Warning } from "@phosphor-icons/react"
import { supabase } from "../../lib/supabase"
import { formatErrorMessage } from "../../lib/errorFormat"
import { useAuthOptional } from "../../state/auth"
import { Icon } from "../../components/ui/Icon"

const fieldClass =
  "input input-bordered h-11 w-full rounded-[10px] border-base-content/10 bg-base-100 text-sm"

type Status = "wait" | "ready" | "missing" | "done"

export function ResetPasswordPage() {
  const auth = useAuthOptional()
  const hasSession = Boolean(auth?.user) || Boolean(auth?.session)
  const loading = auth?.loading ?? true
  const [status, setStatus] = useState<Status>("wait")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (hasSession) {
      setStatus("ready")
      setErrorMsg(null)
      return
    }
    if (loading) return
    const timer = window.setTimeout(() => setStatus("missing"), 3000)
    return () => window.clearTimeout(timer)
  }, [hasSession, loading])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.")
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setErrorMsg(formatErrorMessage(error))
        return
      }
      await supabase.auth.signOut()
      setStatus("done")
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {status === "wait" ? (
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : null}

      {status === "missing" ? (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">Reset link expired</h1>
          <p className="mt-3 text-base-content/70">
            This password reset link is invalid or has expired. Request a fresh one from the
            log in screen.
          </p>
          <Link
            to="/"
            className="btn btn-primary mt-6 rounded-full font-extrabold"
            replace
          >
            Back to log in
          </Link>
        </>
      ) : null}

      {status === "done" ? (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">Password updated</h1>
          <p className="mt-3 text-base-content/70">
            Your password has been changed. Log in with your new password.
          </p>
          <Link to="/" className="btn btn-primary mt-6 rounded-full font-extrabold" replace>
            Log in
          </Link>
        </>
      ) : null}

      {status === "ready" ? (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">Choose a new password</h1>
          <p className="mt-1 text-sm leading-relaxed text-base-content/60">
            Pick something you can remember — at least 6 characters.
          </p>

          {errorMsg ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 text-left text-sm font-semibold text-error"
            >
              <Icon icon={Warning} size="sm" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          ) : null}

          <form className="mt-5 space-y-3.5 text-left" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="reset-password"
                className="mb-1.5 block text-xs font-bold text-base-content/70"
              >
                New password
              </label>
              <input
                id="reset-password"
                name="password"
                type="password"
                required
                minLength={6}
                maxLength={100}
                autoComplete="new-password"
                className={fieldClass}
                placeholder="At least 6 characters" />
            </div>
            <div>
              <label
                htmlFor="reset-password-confirm"
                className="mb-1.5 block text-xs font-bold text-base-content/70"
              >
                Confirm password
              </label>
              <input
                id="reset-password-confirm"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                maxLength={100}
                autoComplete="new-password"
                className={fieldClass}
                placeholder="Repeat your new password" />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary mt-1 min-h-11 w-full rounded-full font-extrabold"
            >
              {saving ? <span className="loading loading-spinner loading-sm" /> : "Save password"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  )
}
