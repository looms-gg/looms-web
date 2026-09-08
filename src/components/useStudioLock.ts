import { useEffect } from "react"

export function setStudioLock(on: boolean) {
  document.documentElement.classList.toggle("studio-lock", on)
}

export function useStudioLock(studio: boolean) {
  useEffect(() => {
    setStudioLock(studio)
    return () => setStudioLock(false)
  }, [studio])
}
