import { useEffect, useId, useState, type FormEvent } from "react"
import {
  DiscordLogo,
  GithubLogo,
  GoogleLogo,
  Warning,
} from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"

import { formatErrorMessage } from "../../lib/errorFormat"
import { isTurnstileEnabled } from "../../lib/turnstile"
import {
  OAUTH_PROVIDERS,
  providerLabel,
  stashOAuthReturn,
  type OAuthProvider,
} from "../../lib/oauth"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ModalOverlay } from "../ui/ModalOverlay"
import { TurnstileWidget } from "./TurnstileWidget"
import { UsernameStep } from "./UsernameStep"

export type AuthMode = "login" | "signup" | "magic_link" | "forgot"

export interface AuthModalProps {
  isOpen: boolean
  initialMode?: AuthMode
  isGate?: boolean
  onClose?: () => void
}

function providerIcon(provider: OAuthProvider) {
  if (provider === "discord") return DiscordLogo
  if (provider === "github") return GithubLogo
  return GoogleLogo
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
  const signInWithOAuth = auth?.signInWithOAuth
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [signupStep, setSignupStep] = useState<"credentials" | "username">("credentials")
  const [pendingSignup, setPendingSignup] = useState<{ email: string; password: string } | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const captchaEnabled = isTurnstileEnabled()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  // Bumped to force TurnstileWidget to mint a fresh token. A consumed token
  // replayed on retry is rejected as "timeout-or-duplicate".
  const [captchaResetCount, setCaptchaResetCount] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setSignupStep("credentials")
    setPendingSignup(null)
    setErrorMsg(null)
    setSuccessMsg(null)
    setCaptchaToken(null)
    setCaptchaError(null)
  }, [initialMode, isOpen])

  const emailId = useId()
  const passwordId = useId()

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
        // Step one only: stash credentials and move to the username step. The
        // account is created once a username is chosen (step two).
        setPendingSignup({ email, password })
        setSignupStep("username")
      } else if (mode === "magic_link") {
        const { error } = await signInWithOtp({
          email: email.trim(),
          captchaToken: captchaToken ?? undefined,
        })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          setSuccessMsg("Link sent. Check your inbox.")
        }
      } else if (mode === "forgot") {
        const { error } = await resetPasswordForEmail({
          email: email.trim(),
          captchaToken: captchaToken ?? undefined,
        })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
        } else {
          setSuccessMsg("Reset link sent. Check your inbox.")
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

  async function handleUsernameSubmit(username: string) {
    if (!signUpWithPassword || !pendingSignup) return
    setLoading(true)
    clearFeedback()
    const { error } = await signUpWithPassword({
      email: pendingSignup.email,
      password: pendingSignup.password,
      username,
    })
    setLoading(false)
    if (error) {
      setErrorMsg(formatErrorMessage(error))
      setSignupStep("credentials")
      resetCaptcha()
    } else {
      onClose?.()
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    if (!signInWithOAuth) return
    clearFeedback()
    setOauthBusy(true)
    stashOAuthReturn(window.location.pathname, window.location.search)
    const { error } = await signInWithOAuth(provider)
    if (error) {
      setErrorMsg(formatErrorMessage(error))
      setOauthBusy(false)
    }
    // On success the page navigates away to the provider; no cleanup needed.
  }

  const title =
    mode === "login"
      ? "Log in"
      : mode === "signup"
        ? signupStep === "username"
          ? "Pick your username"
          : "Sign up"
        : mode === "forgot"
          ? "Reset password"
          : "Magic link"

  const submitLabel =
    mode === "login"
      ? "Log in"
      : mode === "signup"
        ? "Continue"
        : mode === "forgot"
          ? "Send reset link"
          : "Send link"

  const fieldClass =
    "input input-bordered h-11 w-full rounded-[10px] border-base-content/10 bg-base-100 text-sm"

  const onUsernameStep = mode === "signup" && signupStep === "username" && pendingSignup !== null

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
      {!isGate && onClose ? (
        <CloseButton onClick={onClose} className="absolute right-3 top-3 text-base-content/55" />
      ) : null}
      <div className="mb-6 flex justify-center">
        <LoomsLogo variant="wordmark" className="h-8" decorative />
      </div>

      {onUsernameStep ? (
        <>
          <UsernameStep
            title="Pick your username"
            subtitle="You can change this later from your settings."
            submitLabel="Create account"
            busy={loading}
            error={errorMsg}
            onSubmit={(username) => void handleUsernameSubmit(username)} />
          <button
            type="button"
            className="mt-4 text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
            onClick={() => {
              setSignupStep("credentials")
              setPendingSignup(null)
              clearFeedback()
              resetCaptcha()
            }}
          >
            Back
          </button>
        </>
      ) : (
        <>
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

          {mode === "login" || mode === "signup" ? (
            <>
              <div className="mt-5 flex items-center gap-3 text-xs font-bold text-base-content/45">
                <span className="h-px flex-1 bg-base-content/10" />
                or
                <span className="h-px flex-1 bg-base-content/10" />
              </div>
              <div className="oauth-row mt-4">
                {OAUTH_PROVIDERS.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    data-oauth={provider}
                    disabled={oauthBusy || loading}
                    className="oauth-btn"
                    onClick={() => void handleOAuth(provider)}
                  >
                    {oauthBusy ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Icon icon={providerIcon(provider)} size="md" />
                    )}
                    <span className="oauth-label">{providerLabel(provider)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      {!onUsernameStep ? (
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
      ) : null}
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
