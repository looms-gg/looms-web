import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { supabase, type ConnectionProvider, type ConnectionRow } from "../lib/supabase"
import { useAuthOptional } from "./auth"

export type ConnectionsContextValue = {
  connections: ConnectionRow[]
  unlinkConnection: (provider: ConnectionProvider) => Promise<{ error: Error | null }>
  setConnectionFeatured: (
    provider: ConnectionProvider,
    featured: boolean,
  ) => Promise<{ error: Error | null }>
}

export const ConnectionsContext = createContext<ConnectionsContextValue | null>(null)

function toConnectionsError(error: { message: string } | null): Error | null {
  return error ? new Error(error.message) : null
}

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const [connections, setConnections] = useState<ConnectionRow[]>([])

  const fetchConnections = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profile_connections")
        .select("user_id, provider, featured, created_at")
        .eq("user_id", userId)
      if (error) return
      if (data) setConnections(data)
    } catch {
      // Connections are an enhancement; a failed fetch should never break auth.
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setConnections([])
      return
    }
    void fetchConnections(user.id)
  }, [user, fetchConnections])

  const unlinkConnection = useCallback(
    async (provider: ConnectionProvider) => {
      const { error } = await supabase.rpc("unlink_connection", { p_provider: provider })
      if (error) return { error: toConnectionsError(error) }
      if (user) await fetchConnections(user.id)
      return { error: null }
    },
    [user, fetchConnections],
  )

  const setConnectionFeatured = useCallback(
    async (provider: ConnectionProvider, featured: boolean) => {
      const { error } = await supabase.rpc("set_connection_featured", {
        p_provider: provider,
        p_featured: featured,
      })
      if (error) return { error: toConnectionsError(error) }
      if (user) await fetchConnections(user.id)
      return { error: null }
    },
    [user, fetchConnections],
  )

  return (
    <ConnectionsContext value={{ connections, unlinkConnection, setConnectionFeatured }}>
      {children}
    </ConnectionsContext>
  )
}

export function useConnectionsOptional(): ConnectionsContextValue | null {
  return useContext(ConnectionsContext)
}

export function useConnections(): ConnectionsContextValue {
  const context = useContext(ConnectionsContext)
  if (!context) {
    throw new Error("useConnections must be used within a ConnectionsProvider")
  }
  return context
}
