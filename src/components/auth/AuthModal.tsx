import { useEffect, useId, useState, type FormEvent } from "react"
import {
  DiscordLogo,
  GithubLogo,
  GoogleLogo,
  SignIn,
  Warning,
} from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"

import { formatErrorMessage } from "../../lib/errorFormat"
import {
  OAUTH_PROVIDERS,
  providerLabel,
  stashOAuthReturn,
  type OAuthProvider,
} from "../../lib/auth/oauth"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ModalOverlay } from "../ui/ModalOverlay"
import { AuthCaptchaField, useCaptcha } from "./AuthCaptchaField"
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

function hasRequiredAuthMethods(auth: {
  signInWithPassword?: unknown
  signUpWithPassword?: unknown
  signInWithOtp?: unknown
  resetPasswordForEmail?: unknown
}): boolean {
  return Boolean(
    auth.signInWithPassword &&
      auth.signUpWithPassword &&
      auth.signInWithOtp &&
      auth.resetPasswordForEmail,
  )
}

type AuthDispatchHandlers = {
  onSuccess: (msg?: string) => void
  onError: (err: unknown) => void
  onSignupCredentials: (creds: { email: string; password: string }) => void
}

async function dispatchAuthMode({
  mode,
  email,
  password,
  captchaToken,
  auth,
  handlers,
}: {
  mode: AuthMode
  email: string
  password: string
  captchaToken?: string
  auth: {
    signInWithPassword: NonNullable<ReturnType<typeof useAuthOptional>>["signInWithPassword"]
    signInWithOtp: NonNullable<ReturnType<typeof useAuthOptional>>["signInWithOtp"]
    resetPasswordForEmail: NonNullable<ReturnType<typeof useAuthOptional>>["resetPasswordForEmail"]
  }
  handlers: AuthDispatchHandlers
}) {
  switch (mode) {
    case "login": {
      const { error } = await auth.signInWithPassword({ email, password, captchaToken })
      if (error) handlers.onError(error)
      else handlers.onSuccess()
      break
    }
    case "signup":
      handlers.onSignupCredentials({ email, password })
      break
    case "magic_link": {
      const { error } = await auth.signInWithOtp({ email: email.trim(), captchaToken })
      if (error) handlers.onError(error)
      else handlers.onSuccess("Link sent. Check your inbox.")
      break
    }
    case "forgot": {
      const { error } = await auth.resetPasswordForEmail({ email: email.trim(), captchaToken })
      if (error) handlers.onError(error)
      else handlers.onSuccess("Reset link sent. Check your inbox.")
      break
    }
  }
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
  const captcha = useCaptcha()

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setSignupStep("credentials")
    setPendingSignup(null)
    setErrorMsg(null)
    setSuccessMsg(null)
    captcha.clear()
  }, [initialMode, isOpen])

  const emailId = useId()
  const passwordId = useId()

  function clearFeedback() {
    setErrorMsg(null)
    setSuccessMsg(null)
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
    const spentCaptchaToken = captcha.enabled && Boolean(captcha.token)

    try {
      if (
        !hasRequiredAuthMethods({
          signInWithPassword,
          signUpWithPassword,
          signInWithOtp,
          resetPasswordForEmail,
        })
      ) {
        setErrorMsg("Auth is unavailable.")
        return
      }
      if (captcha.enabled && !captcha.token) {
        setErrorMsg("Please complete the captcha before continuing.")
        return
      }

      await dispatchAuthMode({
        mode,
        email,
        password,
        captchaToken: captcha.token ?? undefined,
        auth: {
          signInWithPassword: signInWithPassword!,
          signInWithOtp: signInWithOtp!,
          resetPasswordForEmail: resetPasswordForEmail!,
        },
        handlers: {
          onSuccess: (msg) => {
            if (msg) setSuccessMsg(msg)
            else onClose?.()
          },
          onError: (err) => setErrorMsg(formatErrorMessage(err)),
          onSignupCredentials: (creds) => {
            setPendingSignup(creds)
            setSignupStep("username")
          },
        },
      })
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setLoading(false)
      // Every auth attempt consumes the captcha token server-side (success or
      // failure), so force a fresh one for whatever the user does next.
      if (spentCaptchaToken) captcha.reset()
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
      captcha.reset()
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
              captcha.reset()
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
                    onClick={() => switchMode("magic_link", setMode, clearFeedback, captcha.reset)}
                  >
                    Email me a magic link instead
                  </button>
                  <button
                    type="button"
                    className="text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
                    onClick={() => switchMode("forgot", setMode, clearFeedback, captcha.reset)}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
                onClick={() => switchMode("login", setMode, clearFeedback, captcha.reset)}
              >
                {mode === "forgot" ? "Back to log in" : "Use a password instead"}
              </button>
            )}

            {captcha.enabled ? <AuthCaptchaField captcha={captcha} /> : null}

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
              onClick={() => switchMode("login", setMode, clearFeedback, captcha.reset)}
            >
              Already have an account?{" "}
              <span className="font-extrabold text-primary">Log in</span>
            </button>
          ) : (
            <button
              type="button"
              className="font-semibold transition-colors duration-150 hover:text-base-content"
              onClick={() => switchMode("signup", setMode, clearFeedback, captcha.reset)}
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
          className="btn btn-ghost btn-xs sm:btn-sm font-bold px-2.5 sm:px-3 text-xs sm:text-sm gap-1.5"
          onClick={() => {
            setInitialMode("login")
            setOpen(true)
          }}
        >
          <Icon icon={SignIn} size="sm" />
          <span>Log in</span>
        </button>
        <button
          type="button"
          className="btn btn-primary btn-xs sm:btn-sm font-extrabold px-3 sm:px-4 text-xs sm:text-sm"
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
