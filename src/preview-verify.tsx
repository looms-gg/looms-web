import { useState } from "react"
import { createRoot } from "react-dom/client"
import { AuthContext, type AuthContextValue } from "./state/auth"
import { VerifyEmailModal } from "./components/auth/VerifyEmailModal"
import "./index.css"

const baseUser = {
  id: "u1",
  email: "weaver@looms.dev",
  email_confirmed_at: null as string | null,
} as unknown as AuthContextValue["user"]

function Preview() {
  const [state, setState] = useState<"pending" | "verified">("pending")
  const [theme, setTheme] = useState<"looms" | "looms-light">(
    document.documentElement.getAttribute("data-theme") === "looms-light"
      ? "looms-light"
      : "looms",
  )

  const value: AuthContextValue = {
    user: baseUser,
    session: {} as AuthContextValue["session"],
    profile: { id: "u1", username: "PixelWeaver" } as unknown as AuthContextValue["profile"],
    avatarUrl: null,
    loading: false,
    profileError: null,
    dismissProfileError: () => {},
    deleteAccount: async () => ({ error: null }),
    emailVerified: state === "verified",
    pendingEmail: "weaver@looms.dev",
    emailVerifyOpen: true,
    signInWithPassword: async () => ({ error: null }),
    signUpWithPassword: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    updateProfile: async () => ({ error: null }),
    refreshProfile: async () => {},
    resendConfirmation: async () => ({ error: null }),
    openEmailVerify: () => {},
    dismissEmailVerify: () => setState("pending"),
  }

  return (
    <>
      <div
        className="fixed top-4 left-1/2 z-[200] flex gap-2 rounded-full border border-white/10 bg-black/60 p-1.5 backdrop-blur"
        style={{ position: "fixed" }}
      >
        <button
          type="button"
          onClick={() => setState("pending")}
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
          onClick={() => setState("verified")}
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
          onClick={() => {
            const next = theme === "looms" ? "looms-light" : "looms"
            setTheme(next)
            document.documentElement.setAttribute("data-theme", next)
          }}
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
