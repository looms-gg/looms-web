import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Newspaper, Package, PaintBrush, Pencil, TShirt } from "@phosphor-icons/react"
import { useWardrobe } from "../../state/wardrobe"
import { useAuth } from "../../state/auth"
import { useIsAdmin } from "../../state/useIsAdmin"
import { useLikes } from "../../state/likes"
import { CookieConsentProvider } from "../../state/cookieConsent"
import { CookieBanner } from "./CookieBanner"
import { SiteBanner } from "./SiteBanner"
import { Icon, type IconType } from "../ui/Icon"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ShellAuthControls } from "./ShellAuthControls"
import { NotificationBell } from "./NotificationBell"
import { SiteFooter } from "./SiteFooter"
import { VerifyEmailModal } from "../auth/VerifyEmailModal"
import { OnboardingGate } from "../auth/OnboardingGate"
import { useNavThumbs } from "./useNavThumbs"
import { useStudioLock } from "./useStudioLock"
import { usePendingActionReplay } from "./usePendingActionReplay"
import { useVerifyEmail } from "../../state/verifyEmail"

const links: { to: string; label: string; icon: IconType }[] = [
  { to: "/", label: "Explore", icon: TShirt },
  { to: "/wardrobe", label: "Wardrobe", icon: Package },
  { to: "/studio", label: "Studio", icon: PaintBrush },
  { to: "/editor", label: "Editor", icon: Pencil },
  { to: "/blog", label: "Updates", icon: Newspaper },
]

function pathOn(to: string, pathname: string, from?: string) {
  if (pathname.startsWith("/piece/")) {
    if (from?.startsWith("/wardrobe")) return to === "/wardrobe"
    return to === "/"
  }
  if (to === "/") return pathname === "/"
  if (to === "/blog") return pathname === "/blog" || pathname.startsWith("/blog/")
  return pathname === to
}

function HeaderPills({ pathname, from }: { pathname: string; from?: string }) {
  return links.map((link) => {
    const on = pathOn(link.to, pathname, from)
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/"}
        data-nav-on={on}
        className={`nav-pill ${on ? "nav-pill-on" : ""}`}
      >
        {link.label}
      </NavLink>
    )
  })
}

function DockLinks({ pathname, from }: { pathname: string; from?: string }) {
  return links.map((link) => {
    const on = pathOn(link.to, pathname, from)
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/"}
        data-nav-on={on}
        className={`plaza-dock-link ${on ? "plaza-dock-link-on" : ""}`}
      >
        <Icon icon={link.icon} size="md" />
        {link.label}
      </NavLink>
    )
  })
}

function resolveActiveToast(
  notice: string | null,
  dismissNotice: () => void,
  profileError: string | null,
  dismissProfileError: () => void,
  likesLoadError: string | null,
  dismissLikesLoadError: () => void,
) {
  if (notice != null) return { message: notice, onDismiss: dismissNotice }
  if (profileError != null) return { message: profileError, onDismiss: dismissProfileError }
  if (likesLoadError != null) return { message: likesLoadError, onDismiss: dismissLikesLoadError }
  return null
}

function ShellToast({ toast }: { toast: { message: string; onDismiss: () => void } | null }) {
  if (!toast) return null
  return (
    <div className="toast toast-end z-[60] pb-24 md:pb-6">
      <div className="alert border-0 bg-base-300 text-base-content shadow-none">
        <span className="font-bold">{toast.message}</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs font-bold"
          onClick={toast.onDismiss}
        >
          OK
        </button>
      </div>
    </div>
  )
}

function ShellDock({
  dockRef,
  dockThumb,
  pathname,
  from,
}: {
  dockRef: React.RefObject<HTMLElement | null>
  dockThumb: { ready: boolean; x: number; w: number }
  pathname: string
  from?: string
}) {
  return (
    <nav ref={dockRef} className="plaza-dock md:hidden" aria-label="Primary">
      {dockThumb.ready ? (
        <span
          className="plaza-dock-thumb"
          aria-hidden
          style={{ transform: `translateX(${dockThumb.x}px)`, width: dockThumb.w }}
        />
      ) : null}
      <DockLinks pathname={pathname} from={from} />
    </nav>
  )
}

export function Shell() {
  return (
    <CookieConsentProvider>
      <ShellFrame />
    </CookieConsentProvider>
  )
}

function ShellFrame() {
  const { notice, dismissNotice } = useWardrobe()
  const {
    user,
    profile,
    avatarUrl,
    signOut,
    emailVerified,
    profileError,
    dismissProfileError,
  } = useAuth()
  const isAdmin = useIsAdmin()
  const { show: openEmailVerify } = useVerifyEmail()
  const { loadError: likesLoadError, dismissLoadError } = useLikes()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  // Immersive routes: full-height shell, no footer, body scroll locked
  // (html.studio-lock) so the workspace owns the viewport.
  const immersive = location.pathname === "/studio" || location.pathname === "/editor"
  const { navRef, dockRef, thumb, dockThumb } = useNavThumbs(location.pathname + (from ?? ""))
  useStudioLock(immersive)
  usePendingActionReplay()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          // Hysteresis: dock past 28px, undock above 10px to prevent jitter/flicker
          setScrolled((prev) => {
            if (!prev && y > 28) return true
            if (prev && y < 10) return false
            return prev
          })
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const displayName = profile?.username || user?.email?.split("@")[0] || "Player"
  const toast = resolveActiveToast(
    notice,
    dismissNotice,
    profileError,
    dismissProfileError,
    likesLoadError,
    dismissLoadError,
  )

  return (
    <div
      className={`bg-base-100 text-base-content ${
        immersive ? "flex h-svh flex-col overflow-hidden" : "min-h-svh"
      }`}
    >
      <header className="sticky top-0 z-40 w-full pointer-events-none">
        <div
          className={`nav-bar-container pointer-events-auto mx-auto ${
            immersive || scrolled ? "nav-bar-docked" : "nav-bar-floating"
          }`}
        >
          <div
            className={`mx-auto flex h-[58px] sm:h-[64px] items-center justify-between gap-3 sm:gap-6 ${
              immersive
                ? "w-full max-w-[1440px] px-5 lg:px-12"
                : "w-[calc(100%-40px)] lg:w-[calc(100%-96px)] max-w-[1344px] px-4 sm:px-6"
            }`}
          >
            <div className="flex items-center gap-4 lg:gap-8 h-full min-w-0">
              <NavLink
                to="/"
                className="flex w-fit shrink-0 items-center rounded-lg outline-offset-4"
                aria-label="looms home"
              >
                <LoomsLogo decorative className="h-7 sm:h-8" />
              </NavLink>
              <nav ref={navRef} className="nav-pills hidden md:flex items-center h-full">
                {thumb.ready ? (
                  <span
                    className="nav-thumb"
                    aria-hidden
                    style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }}
                  />
                ) : null}
                <HeaderPills pathname={location.pathname} from={from} />
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell />
              <ShellAuthControls
                user={user}
                isAdmin={isAdmin}
                displayName={displayName}
                username={profile?.username}
                minecraftUsername={profile?.minecraft_username}
                avatarUrl={avatarUrl}
                emailVerified={emailVerified}
                onOpenEmailVerify={openEmailVerify}
                onSignOut={() => signOut()}
              />
            </div>
          </div>
        </div>
      </header>
      <SiteBanner />

      <main
        className={
          location.pathname === "/editor"
            ? "studio-main flex w-full min-h-0 flex-1 flex-col overflow-hidden p-0 relative"
            : immersive
              ? "studio-main flex w-full min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 lg:px-6"
              : "mx-auto max-w-[1440px] px-5 py-6 pb-28 lg:px-12"
        }
      >
        <Outlet />
      </main>

      {!immersive ? <SiteFooter /> : null}

      <ShellDock dockRef={dockRef} dockThumb={dockThumb} pathname={location.pathname} from={from} />

      <VerifyEmailModal />
      <OnboardingGate />
      <CookieBanner />

      <ShellToast toast={toast} />
    </div>
  )
}
