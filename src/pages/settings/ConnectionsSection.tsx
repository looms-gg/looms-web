import { useState } from "react"
import { DiscordLogo, GoogleLogo, WindowsLogo } from "@phosphor-icons/react"
import { useAuth } from "../../state/auth"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  OAUTH_PROVIDERS,
  providerLabel,
  stashOAuthReturn,
  type OAuthProvider,
} from "../../lib/oauth"
import type { ConnectionProvider } from "../../lib/supabase"
import { Icon } from "../../components/ui/Icon"

function providerIcon(provider: OAuthProvider) {
  if (provider === "discord") return DiscordLogo
  if (provider === "google") return GoogleLogo
  return WindowsLogo
}

export function ConnectionsSection() {
  const { connections, unlinkConnection, setConnectionFeatured, signInWithOAuth } = useAuth()
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function run(
    provider: ConnectionProvider,
    action: () => Promise<{ error: Error | null }>,
  ) {
    setBusyProvider(provider)
    setErrorMsg(null)
    const { error } = await action()
    setBusyProvider(null)
    if (error) setErrorMsg(formatErrorMessage(error))
  }

  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Connections</h2>
      <p className="mt-0.5 text-sm text-base-content/65">
        Linked accounts you can sign in with. Only Discord can appear on your profile.
      </p>
      <ul className="mt-4 space-y-3">
        {OAUTH_PROVIDERS.map((provider) => {
          const row = connections.find((c) => c.provider === provider)
          const busy = busyProvider === provider
          return (
            <li
              key={provider}
              className="flex items-center justify-between gap-3 rounded-xl bg-base-100/80 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon icon={providerIcon(provider)} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{providerLabel(provider)}</p>
                  <p className="text-xs text-base-content/60">
                    {row ? "Linked" : "Not linked"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row && provider === "discord" ? (
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={row.featured}
                    disabled={busy}
                    aria-label="Feature Discord on your profile"
                    title="Shows a Discord badge on your public profile"
                    onChange={(event) =>
                      void run(provider, () =>
                        setConnectionFeatured(provider, event.target.checked),
                      )
                    } />
                ) : null}
                {row ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm rounded-full font-bold"
                    disabled={busy}
                    onClick={() => void run(provider, () => unlinkConnection(provider))}
                  >
                    Unlink
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm rounded-full font-extrabold"
                    disabled={busy}
                    onClick={() => {
                      stashOAuthReturn("/settings", "?tab=connections")
                      void run(provider, () => signInWithOAuth(provider))
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {errorMsg ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </section>
  )
}
