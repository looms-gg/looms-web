import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AuthContext, type AuthContextValue } from "./state/auth"
import {
  VerifyEmailProvider,
  useVerifyEmail,
} from "./state/verifyEmail"
import { VerifyEmailModal } from "./components/auth/VerifyEmailModal"
import "./index.css"

// Dev-only harness (entry: preview-verify.html) for eyeballing the
// VerifyEmailModal states without a backend. The stub context is typed as a
// Partial and spread into the full AuthContextValue on purpose: forgetting a
// field is a compile error, not a silent runtime gap.
const baseUser = {
  id: "u1",
  email: "weaver@looms.dev",
  email_confirmed_at: null as string | null,
} as unknown as AuthContextValue["user"]

const noopAsyncSuccess = async () => ({ error: null })
const noop = () => {}

const baseAuthContext: Omit<AuthContextValue, "emailVerified"> = {
  user: baseUser,
  session: {} as AuthContextValue["session"],
  profile: { id: "u1", username: "PixelWeaver" } as unknown as AuthContextValue["profile"],
  avatarUrl: null,
  loading: false,
  profileError: null,
  dismissProfileError: noop,
  deleteAccount: noopAsyncSuccess,
  pendingEmail: "weaver@looms.dev",
  signInWithPassword: noopAsyncSuccess,
  signUpWithPassword: noopAsyncSuccess,
  signInWithOAuth: noopAsyncSuccess,
  completeOnboarding: noopAsyncSuccess,
  signInWithOtp: noopAsyncSuccess,
  resetPasswordForEmail: noopAsyncSuccess,
  signOut: noopAsyncSuccess,
  updateProfile: noopAsyncSuccess,
  refreshProfile: async () => {},
  resendConfirmation: noopAsyncSuccess,
}

function Preview() {
  const [state, setState] = useState<"pending" | "verified">("pending")
  const { show } = useVerifyEmail()

  useEffect(() => {
    show()
  }, [show])

  const setPending = () => {
    setState("pending")
    show()
  }
  const setVerified = () => {
    setState("verified")
    show()
  }

  const value: AuthContextValue = {
    ...baseAuthContext,
    emailVerified: state === "verified",
  }

  return (
    <>
      <div
        className="fixed top-4 left-1/2 z-[200] flex gap-2 rounded-full border border-white/10 bg-black/60 p-1.5 backdrop-blur"
        style={{ position: "fixed" }}
      >
        <button
          type="button"
          onClick={setPending}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            state === "pending"
              ? "bg-primary text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          Waiting
        </button>
        <button
          type="button"
          onClick={setVerified}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            state === "verified"
              ? "bg-primary text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          Verified
        </button>
      </div>

      <AuthContext.Provider value={value}>
        <VerifyEmailModal />
      </AuthContext.Provider>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <VerifyEmailProvider>
    <Preview />
  </VerifyEmailProvider>,
)
