import { useLayoutEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react"

type Thumb = { x: number; w: number; ready: boolean }

function readThumb(el: HTMLElement | null): Thumb | null {
  const on = el?.querySelector<HTMLElement>("[data-nav-on='true']")
  if (!on) return null
  return { x: on.offsetLeft, w: on.offsetWidth, ready: true }
}

function syncThumbs(
  navRef: RefObject<HTMLElement | null>,
  dockRef: RefObject<HTMLElement | null>,
  setThumb: Dispatch<SetStateAction<Thumb>>,
  setDockThumb: Dispatch<SetStateAction<Thumb>>,
) {
  const navThumb = readThumb(navRef.current)
  if (navThumb) setThumb(navThumb)
  const dockThumb = readThumb(dockRef.current)
  if (dockThumb) setDockThumb(dockThumb)
}

export function useNavThumbs(pathname: string) {
  const navRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const [thumb, setThumb] = useState<Thumb>({ x: 0, w: 0, ready: false })
  const [dockThumb, setDockThumb] = useState<Thumb>({ x: 0, w: 0, ready: false })

  useLayoutEffect(() => {
    syncThumbs(navRef, dockRef, setThumb, setDockThumb)
    const onResize = syncThumbs.bind(null, navRef, dockRef, setThumb, setDockThumb)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [pathname])

  return { navRef, dockRef, thumb, dockThumb }
}

