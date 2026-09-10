import { useEffect, useState } from "react"
import { CheckCircle, CircleNotch, EnvelopeSimple } from "@phosphor-icons/react"
import { useAuth } from "../../state/auth"
import { formatErrorMessage } from "../../lib/errorFormat"
import { Icon } from "../ui/Icon"
import { ModalOverlay } from "../ui/ModalOverlay"

function useResendCountdown(resendWait: number, setResendWait: (fn: (value: number) => number) => void) {
  useEffect(() => {
    if (resendWait <= 0) return
    const timer = window.setInterval(() => {
      setResendWait((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendWait, setResendWait])
}

export function VerifyEmailModal() {
  const {
    user,
    pendingEmail,
    emailVerified,
    emailVerifyOpen,
    resendConfirmation,
    dismissEmailVerify,
  } = useAuth()
  const [resendWait, setResendWait] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const email = user?.email || pendingEmail
  useResendCountdown(resendWait, setResendWait)

  const open = Boolean(emailVerifyOpen && email)

  async function sendAgain() {
    if (sending || resendWait > 0) return
    setSending(true)
    setResendError(null)
    const { error } = await resendConfirmation()
    setSending(false)
    if (error) {
      setResendError(formatErrorMessage(error))
      return
    }
    // Supabase enforces a 60s per-user window on signup confirmation emails;
    // retrying sooner than that just burns the shared auth rate-limit budget.
    setResendWait(60)
  }

  return (
    <ModalOverlay
      open={open}
      dismissible={false}
      labelledBy="verify-email-title"
      scrimClassName="auth-scrim"
      panelClassName="auth-scrim-panel relative w-full max-w-[22rem] rounded-[18px] border border-base-content/10 bg-base-200 p-6"
      portal
    >
      {emailVerified ? (
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
            <Icon icon={CheckCircle} className="size-6" />
          </span>
          <h2 id="verify-email-title" className="mt-4 text-2xl font-black tracking-tight">
            You're in
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-base-content/65">
            {email} is confirmed. The wardrobe is yours.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon icon={EnvelopeSimple} className="size-6" />
          </span>
          <h2
            id="verify-email-title"
            className="mt-4 text-2xl font-black tracking-tight text-balance"
          >
            Check your inbox
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-base-content/65">
            We sent a confirmation link to{" "}
            <span className="font-extrabold text-base-content">{email}</span>. Open it in a
            new tab and you'll be signed in here automatically.
          </p>

          <div
            className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-base-content/70"
            aria-live="polite"
          >
            <Icon
              icon={CircleNotch}
              className="size-4 animate-spin text-primary motion-reduce:animate-none"
            />
            <span>Waiting for confirmation</span>
          </div>

          {resendError ? (
            <p className="mt-3 text-xs font-medium text-error" role="alert">
              {resendError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="btn btn-primary min-h-11 w-full rounded-full font-extrabold tabular-nums"
              disabled={sending || resendWait > 0}
              onClick={() => void sendAgain()}
            >
              {sending
                ? "Sending…"
                : resendWait > 0
                  ? `Send another link in ${resendWait}s`
                  : "Send another link"}
            </button>
            <button
              type="button"
              className="btn btn-ghost min-h-11 w-full rounded-full font-bold text-base-content/70"
              onClick={dismissEmailVerify}
            >
              I'll confirm later
            </button>
          </div>
        </div>
      )}
    </ModalOverlay>
  )
}
