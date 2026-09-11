import { useEffect, useId, useState, type FormEvent } from "react"
import { Warning } from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS, sanitizeMinecraftUsername, sanitizeUsername } from "../../lib/sanitize"
import { isTurnstileEnabled } from "../../lib/turnstile"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ModalOverlay } from "../ui/ModalOverlay"
import { TurnstileWidget } from "./TurnstileWidget"

export type AuthMode = "login" | "signup" | "magic_link" | "forgot"

export interface AuthModalProps {
  isOpen: boolean
  initialMode?: AuthMode
  isGate?: boolean
  onClose?: () => void
}

function switchMode(
  next: AuthMode,
  setMode: (mode: AuthMode) => void,
  clear: () => void,
  resetCaptcha: () => void,
) {
  setMode(next)
  clear()
  resetCaptcha()
}

export function AuthModal({
  isOpen,
  initialMode = "login",
  isGate = false,
  onClose,
}: AuthModalProps) {
  const auth = useAuthOptional()
  const signInWithPassword = auth?.signInWithPassword
  const signUpWithPassword = auth?.signUpWithPassword
  const signInWithOtp = auth?.signInWithOtp
  const resetPasswordForEmail = auth?.resetPasswordForEmail
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [mcUsername, setMcUsername] = useState("")
  const captchaEnabled = isTurnstileEnabled()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  // Bumped to force TurnstileWidget to mint a fresh token. A consumed token
  // replayed on retry is rejected as "timeout-or-duplicate".
  const [captchaResetCount, setCaptchaResetCount] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setErrorMsg(null)
    setSuccessMsg(null)
    setCaptchaToken(null)
    setCaptchaError(null)
  }, [initialMode, isOpen])

  const emailId = useId()
  const passwordId = useId()
  const usernameId = useId()
  const mcId = useId()

  function clearFeedback() {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function resetCaptcha() {
    setCaptchaToken(null)
    setCaptchaError(null)
    setCaptchaResetCount((count) => count + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearFeedback()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "").trim()
    // Captured before the await: this token (if any) is consumed server-side
    // during this attempt and must not be replayed afterwards.
    const spentCaptchaToken = captchaEnabled && Boolean(captchaToken)

    try {
      if (!signInWithPassword || !signUpWithPassword || !signInWithOtp || !resetPasswordForEmail) {
        setErrorMsg("Auth is unavailable.")
        return
      }
      if (captchaEnabled && !captchaToken) {
        setErrorMsg("Please complete the captcha before continuing.")
        return
      }
      if (mode === "login") {
        const { error } = await signInWithPassword({ email, password, captchaToken: captchaToken ?? undefined })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          onClose?.()
        }
      } else if (mode === "signup") {
        const username = String(formData.get("username") ?? "").trim()
        const minecraftUsername = String(formData.get("minecraftUsername") ?? "").trim()
        if (!username) {
          setErrorMsg("Please choose a display username.")
          setLoading(false)
          return
        }

        const cleanUsername = sanitizeUsername(username)
        const cleanMc = minecraftUsername
          ? sanitizeMinecraftUsername(minecraftUsername)
          : undefined

        const { error } = await signUpWithPassword({
          email: email.trim(),
          password,
          username: cleanUsername,
          minecraftUsername: cleanMc,
          captchaToken: captchaToken ?? undefined,
        })

        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          onClose?.()
        }
      } else if (mode === "magic_link") {
        const { error } = await signInWithOtp({
          email: email.trim(),
          captchaToken: captchaToken ?? undefined,
        })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          setSuccessMsg("Link sent — check your inbox.")
        }
      } else if (mode === "forgot") {
        const { error } = await resetPasswordForEmail({
          email: email.trim(),
          captchaToken: captchaToken ?? undefined,
        })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          setSuccessMsg("Reset link sent — check your inbox.")
        }
      }
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setLoading(false)
      // Every auth attempt consumes the captcha token server-side (success or
      // failure), so force a fresh one for whatever the user does next.
      if (spentCaptchaToken) resetCaptcha()
    }
  }

  const cleanMcPreview = sanitizeMinecraftUsername(mcUsername)
  const mcAvatarUrl = cleanMcPreview
    ? `https://minotar.net/helm/${encodeURIComponent(cleanMcPreview)}/48.png`
    : null

  const title =
    mode === "login"
      ? "Log in"
      : mode === "signup"
        ? "Sign up"
        : mode === "forgot"
          ? "Reset password"
          : "Magic link"

  const submitLabel =
    mode === "login"
      ? "Log in"
      : mode === "signup"
        ? "Create account"
        : mode === "forgot"
          ? "Send reset link"
          : "Send link"

  const fieldClass =
    "input input-bordered h-11 w-full rounded-[10px] border-base-content/10 bg-base-100 text-sm"

  return (
    <ModalOverlay
      open={Boolean(isOpen && auth)}
      onClose={onClose}
      dismissible={!isGate}
      labelledBy="auth-dialog-title"
      scrimClassName="auth-scrim"
      panelClassName="auth-scrim-panel relative w-full max-w-[22rem] rounded-[18px] border border-base-content/10 bg-base-200 p-6"
      portal
    >
      <div className="relative mb-6 flex items-center justify-center">
        <LoomsLogo variant="wordmark" className="h-8" decorative />
        {!isGate && onClose ? (
          <CloseButton onClick={onClose} className="absolute right-0 top-1/2 -translate-y-1/2 text-base-content/55" />
        ) : null}
      </div>

      <h2
        id="auth-dialog-title"
        className="text-balance text-2xl font-extrabold tracking-tight text-base-content"
      >
        {title}
      </h2>
      {mode === "magic_link" ? (
        <p className="mt-1 text-sm leading-relaxed text-base-content/60">
          We’ll email a one-click sign-in link. No password needed.
        </p>
      ) : null}
      {mode === "forgot" ? (
        <p className="mt-1 text-sm leading-relaxed text-base-content/60">
          We’ll email a link to choose a new password.
        </p>
      ) : null}

      {errorMsg ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 text-sm font-semibold text-error"
        >
          <Icon icon={Warning} size="sm" className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </p>
      ) : null}

      {successMsg ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-success">
          {successMsg}
        </p>
      ) : null}

      <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-xs font-bold text-base-content/70"
          >
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            maxLength={100}
            autoComplete="email"
            className={fieldClass}
            placeholder="you@looms.gg" />
        </div>

        {mode !== "magic_link" && mode !== "forgot" ? (
          <div>
            <label
              htmlFor={passwordId}
              className="mb-1.5 block text-xs font-bold text-base-content/70"
            >
              Password
            </label>
            <input
              id={passwordId}
              name="password"
              type="password"
              required
              minLength={6}
              maxLength={100}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={fieldClass}
              placeholder="At least 6 characters" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
                onClick={() => switchMode("magic_link", setMode, clearFeedback, resetCaptcha)}
              >
                Email me a magic link instead
              </button>
              <button
                type="button"
                className="text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
                onClick={() => switchMode("forgot", setMode, clearFeedback, resetCaptcha)}
              >
                Forgot password?
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
            onClick={() => switchMode("login", setMode, clearFeedback, resetCaptcha)}
          >
            {mode === "forgot" ? "Back to log in" : "Use a password instead"}
          </button>
        )}

        {mode === "signup" ? (
          <>
            <div>
              <label
                htmlFor={usernameId}
                className="mb-1.5 block text-xs font-bold text-base-content/70"
              >
                Username
              </label>
              <input
                id={usernameId}
                name="username"
                required
                maxLength={MAX_LIMITS.USERNAME}
                autoComplete="username"
                className={fieldClass}
                placeholder="PixelWeaver" />
            </div>

            <div>
              <label
                htmlFor={mcId}
                className="mb-1.5 block text-xs font-bold text-base-content/70"
              >
                Minecraft username
                <span className="ml-1 font-semibold text-base-content/45">optional</span>
              </label>
              <div className="relative">
                {mcAvatarUrl ? (
                  <img
                    src={mcAvatarUrl}
                    alt=""
                    className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 rounded-sm border border-base-content/15 [image-rendering:pixelated]" />
                ) : null}
                <input
                  id={mcId}
                  name="minecraftUsername"
                  autoComplete="off"
                  maxLength={MAX_LIMITS.MINECRAFT_USERNAME}
                  className={`${fieldClass}${mcAvatarUrl ? " pl-11" : ""}`}
                  placeholder="Java IGN"
                  value={mcUsername}
                  onChange={(e) => setMcUsername(e.target.value)} />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-base-content/50">
                Sets your studio avatar helm from your skin.
              </p>
            </div>
          </>
        ) : null}

        {captchaEnabled ? (
          <div>
            <TurnstileWidget
              resetKey={captchaResetCount}
              onToken={(token) => {
                setCaptchaToken(token)
                if (token) setCaptchaError(null)
              }}
              onError={setCaptchaError} />
            {captchaError ? (
              <p role="alert" className="mt-1.5 text-xs font-bold text-error">
                {captchaError}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary mt-1 min-h-11 w-full rounded-full font-extrabold"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            submitLabel
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-base-content/55">
        {mode === "signup" ? (
          <button
            type="button"
            className="font-semibold transition-colors duration-150 hover:text-base-content"
            onClick={() => switchMode("login", setMode, clearFeedback, resetCaptcha)}
          >
            Already have an account?{" "}
            <span className="font-extrabold text-primary">Log in</span>
          </button>
        ) : (
          <button
            type="button"
            className="font-semibold transition-colors duration-150 hover:text-base-content"
            onClick={() => switchMode("signup", setMode, clearFeedback, resetCaptcha)}
          >
            New here? <span className="font-extrabold text-primary">Sign up</span>
          </button>
        )}
      </div>
    </ModalOverlay>
  )
}

export function AuthButtons() {
  const [open, setOpen] = useState(false)
  const [initialMode, setInitialMode] = useState<AuthMode>("login")

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn btn-ghost btn-xs sm:btn-sm rounded-full font-bold px-2.5 sm:px-3 text-xs sm:text-sm"
          onClick={() => {
            setInitialMode("login")
            setOpen(true)
          }}
        >
          Log in
        </button>
        <button
          type="button"
          className="btn btn-primary btn-xs sm:btn-sm rounded-full font-extrabold px-3 sm:px-4 text-xs sm:text-sm"
          onClick={() => {
            setInitialMode("signup")
            setOpen(true)
          }}
        >
          Sign up
        </button>
      </div>

      <AuthModal
        isOpen={open}
        initialMode={initialMode}
        isGate={false}
        onClose={() => setOpen(false)} />
    </>
  )
}

export const PlayerNameModal = AuthButtons
