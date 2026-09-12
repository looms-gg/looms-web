import { useId, useState, type FormEvent } from "react"
import { MAX_LIMITS, sanitizeUsername } from "../../lib/sanitize"

export function UsernameStep({
  initialUsername = "",
  busy,
  error,
  title,
  subtitle,
  submitLabel,
  onSubmit,
}: {
  initialUsername?: string
  busy: boolean
  error: string | null
  title: string
  subtitle: string
  submitLabel: string
  onSubmit: (username: string) => void
}) {
  const [value, setValue] = useState(initialUsername)
  const [localError, setLocalError] = useState<string | null>(null)
  const usernameId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = sanitizeUsername(value)
    if (!clean) {
      setLocalError("Please choose a username.")
      return
    }
    setLocalError(null)
    onSubmit(clean)
  }

  return (
    <>
      <h2 className="text-balance text-2xl font-extrabold tracking-tight text-base-content">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-base-content/60">{subtitle}</p>
      {error ?? localError ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-error">
          {error ?? localError}
        </p>
      ) : null}
      <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor={usernameId}
            className="mb-1.5 block text-xs font-bold text-base-content/70"
          >
            Username
          </label>
          <input
            id={usernameId}
            required
            maxLength={MAX_LIMITS.USERNAME}
            autoComplete="username"
            className="input input-bordered h-11 w-full rounded-[10px] border-base-content/10 bg-base-100 text-sm"
            placeholder="PixelWeaver"
            value={value}
            onChange={(e) => setValue(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary mt-1 min-h-11 w-full rounded-full font-extrabold"
        >
          {busy ? <span className="loading loading-spinner loading-sm" /> : submitLabel}
        </button>
      </form>
    </>
  )
}
