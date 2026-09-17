import { useState, type ChangeEvent } from "react"
import { DiscordLogo, GithubLogo, GoogleLogo } from "@phosphor-icons/react"
import { useAuth } from "../../state/auth"
import { useConnections } from "../../state/connections"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  OAUTH_PROVIDERS,
  providerLabel,
  stashOAuthReturn,
  type OAuthProvider,
} from "../../lib/auth/oauth"
import type { ConnectionProvider, ConnectionRow } from "../../lib/supabase"
import { Icon } from "../../components/ui/Icon"

function providerIcon(provider: OAuthProvider) {
  if (provider === "discord") return DiscordLogo
  if (provider === "github") return GithubLogo
  return GoogleLogo
}

function ConnectionRowItem({
  provider,
  row,
  busy,
  onFeatureChange,
  onUnlink,
  onConnect,
}: {
  provider: OAuthProvider
  row?: ConnectionRow
  busy: boolean
  onFeatureChange: (provider: ConnectionProvider, featured: boolean) => void
  onUnlink: (provider: ConnectionProvider) => void
  onConnect: (provider: OAuthProvider) => void
}) {
  const handleFeatureToggle = (event: ChangeEvent<HTMLInputElement>) => {
    onFeatureChange(provider, event.target.checked)
  }

  const handleUnlink = () => {
    onUnlink(provider)
  }

  const handleConnect = () => {
    onConnect(provider)
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-base-100/80 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon icon={providerIcon(provider)} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{providerLabel(provider)}</p>
          <p className="text-xs text-base-content/75">{row ? "Linked" : "Not linked"}</p>
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
            onChange={handleFeatureToggle}
          />
        ) : null}
        {row ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-full font-bold"
            disabled={busy}
            onClick={handleUnlink}
          >
            Unlink
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-full font-extrabold"
            disabled={busy}
            onClick={handleConnect}
          >
            Connect
          </button>
        )}
      </div>
    </li>
  )
}

export function ConnectionsSection() {
  const { signInWithOAuth } = useAuth()
  const { connections, unlinkConnection, setConnectionFeatured } = useConnections()
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function run(
    provider: ConnectionProvider,
    action: () => Promise<{ error: Error | null }>,
  ) {
    setBusyProvider(provider)
    setErrorMsg(null)
    try {
      const { error } = await action()
      if (error) setErrorMsg(formatErrorMessage(error))
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setBusyProvider(null)
    }
  }

  const handleFeatureChange = (provider: ConnectionProvider, featured: boolean) => {
    void run(provider, () => setConnectionFeatured(provider, featured))
  }

  const handleUnlink = (provider: ConnectionProvider) => {
    void run(provider, () => unlinkConnection(provider))
  }

  const handleConnect = (provider: OAuthProvider) => {
    stashOAuthReturn("/settings", "?tab=connections")
    void run(provider, () => signInWithOAuth(provider))
  }

  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Connections</h2>
      <p className="mt-0.5 text-sm text-base-content/75">
        Linked accounts you can sign in with. Only Discord can appear on your profile.
      </p>
      <ul className="mt-4 space-y-3">
        {OAUTH_PROVIDERS.map((provider) => (
          <ConnectionRowItem
            key={provider}
            provider={provider}
            row={connections.find((c) => c.provider === provider)}
            busy={busyProvider === provider}
            onFeatureChange={handleFeatureChange}
            onUnlink={handleUnlink}
            onConnect={handleConnect}
          />
        ))}
      </ul>
      {errorMsg ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </section>
  )
}
