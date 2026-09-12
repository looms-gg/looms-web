import { useState } from "react"
import { useAuthOptional } from "../../state/auth"
import { formatErrorMessage } from "../../lib/errorFormat"
import { pickOAuthUsername } from "../../lib/oauth"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ModalOverlay } from "../ui/ModalOverlay"
import { UsernameStep } from "./UsernameStep"

export function OnboardingGate() {
  const auth = useAuthOptional()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const open = Boolean(
    auth &&
      !auth.loading &&
      auth.user &&
      auth.emailVerified &&
      auth.profile &&
      !auth.profile.onboarding_complete,
  )

  if (!auth || !open) return null

  const prefill = pickOAuthUsername(auth.user)

  return (
    <ModalOverlay
      open={open}
      dismissible={false}
      labelledBy="onboarding-title"
      scrimClassName="auth-scrim"
      panelClassName="auth-scrim-panel relative w-full max-w-[22rem] rounded-[18px] border border-base-content/10 bg-base-200 p-6"
      portal
    >
      <div className="mb-6 flex justify-center">
        <LoomsLogo variant="wordmark" className="h-8" decorative />
      </div>
      <UsernameStep
        title="One last step"
        subtitle="Pick the name you'll go by across looms."
        submitLabel="Start styling"
        busy={busy}
        error={errorMsg}
        initialUsername={prefill}
        onSubmit={(username) => {
          setBusy(true)
          setErrorMsg(null)
          void auth
            .completeOnboarding(username)
            .then(async ({ error }) => {
              if (error) {
                setErrorMsg(formatErrorMessage(error))
                setBusy(false)
                return
              }
              await auth.refreshProfile()
              setBusy(false)
            })
        }} />
      <button
        type="button"
        className="mt-4 text-xs font-bold text-base-content/55 transition-colors duration-150 hover:text-primary"
        onClick={() => void auth.signOut()}
      >
        Log out instead
      </button>
    </ModalOverlay>
  )
}
