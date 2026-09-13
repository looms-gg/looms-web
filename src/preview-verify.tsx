import { useState } from "react"
import { createRoot } from "react-dom/client"
import { AuthContext, type AuthContextValue } from "./state/auth"
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

const baseAuthContext: Omit<AuthContextValue, "emailVerified" | "dismissEmailVerify"> = {
  user: baseUser,
  session: {} as AuthContextValue["session"],
  profile: { id: "u1", username: "PixelWeaver" } as unknown as AuthContextValue["profile"],
  avatarUrl: null,
  isAdmin: false,
  loading: false,
  profileError: null,
  dismissProfileError: noop,
  deleteAccount: noopAsyncSuccess,
  pendingEmail: "weaver@looms.dev",
  emailVerifyOpen: true,
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
  openEmailVerify: noop,
}

function Preview() {
  const [state, setState] = useState<"pending" | "verified">("pending")
  const [theme, setTheme] = useState<"looms" | "looms-light">(
    document.documentElement.getAttribute("data-theme") === "looms-light"
      ? "looms-light"
      : "looms",
  )

  const setPending = () => setState("pending")
  const setVerified = () => setState("verified")
  const toggleTheme = () => {
    const next = theme === "looms" ? "looms-light" : "looms"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
  }

  const value: AuthContextValue = {
    ...baseAuthContext,
    emailVerified: state === "verified",
    dismissEmailVerify: setPending,
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
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white/60 transition-colors hover:text-white"
        >
          Theme
        </button>
      </div>

      <AuthContext.Provider value={value}>
        <VerifyEmailModal />
      </AuthContext.Provider>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Preview />)
