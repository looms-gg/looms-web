import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

export type VerifyEmailContextValue = {
  open: boolean
  show: () => void
  dismiss: () => void
}

export const VerifyEmailContext = createContext<VerifyEmailContextValue | null>(null)

/**
 * Imperative handle for AuthProvider's effects, which open/close the modal
 * outside the React tree (watchUnconfirmed, the verified flash, sign-out).
 * The provider registers itself on mount; without one the calls no-op so
 * AuthProvider stays usable standalone (tests, previews).
 */
export type VerifyEmailControls = {
  getOpen: () => boolean
  setOpen: (open: boolean) => void
}

const controlsRef: { current: VerifyEmailControls | null } = { current: null }

const noopControls: VerifyEmailControls = {
  getOpen: () => false,
  setOpen: () => {},
}

export function getEmailVerifyControls(): VerifyEmailControls {
  return controlsRef.current ?? noopControls
}

export function VerifyEmailProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(open)

  const setOpenSynced = useCallback((value: boolean) => {
    openRef.current = value
    setOpen(value)
  }, [])

  useEffect(() => {
    controlsRef.current = { getOpen: () => openRef.current, setOpen: setOpenSynced }
    return () => {
      controlsRef.current = null
    }
  }, [setOpenSynced])

  const show = useCallback(() => setOpenSynced(true), [setOpenSynced])
  const dismiss = useCallback(() => setOpenSynced(false), [setOpenSynced])
  const value = useMemo(() => ({ open, show, dismiss }), [open, show, dismiss])

  return <VerifyEmailContext value={value}>{children}</VerifyEmailContext>
}

export function useVerifyEmail(): VerifyEmailContextValue {
  const context = useContext(VerifyEmailContext)
  if (!context) {
    throw new Error("useVerifyEmail must be used within a VerifyEmailProvider")
  }
  return context
}
