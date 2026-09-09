import { NavLink, Outlet, useLocation } from "react-router-dom"
import { faBoxOpen, faShirt, faWandSparkles } from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { useCloset } from "../../state/closet"
import { useAuth } from "../../state/auth"
import { useLikes } from "../../state/likes"
import { CookieConsentProvider } from "../../state/cookieConsent"
import { CookieBanner } from "./CookieBanner"
import { SiteBanner } from "./SiteBanner"
import { FaIcon } from "../ui/FaIcon"
import { LoomsLogo } from "../ui/LoomsLogo"
import { ShellAuthControls } from "./ShellAuthControls"
import { SiteFooter } from "./SiteFooter"
import { ThemeToggle } from "./ThemeToggle"
import { VerifyEmailModal } from "../auth/VerifyEmailModal"
import { useNavThumbs } from "./useNavThumbs"
import { useStudioLock } from "./useStudioLock"

const links: { to: string; label: string; icon: IconDefinition }[] = [
  { to: "/", label: "Explore", icon: faShirt },
  { to: "/wardrobe", label: "Wardrobe", icon: faBoxOpen },
  { to: "/studio", label: "Studio", icon: faWandSparkles },
]

function pathOn(to: string, pathname: string, from?: string) {
  if (pathname.startsWith("/piece/")) {
    if (from?.startsWith("/wardrobe")) return to === "/wardrobe"
    return to === "/"
  }
  if (to === "/") return pathname === "/"
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
        <FaIcon icon={link.icon} className="size-4" />
        {link.label}
      </NavLink>
    )
  })
}

export function Shell() {
  return (
    <CookieConsentProvider>
      <ShellFrame />
    </CookieConsentProvider>
  )
}

function ShellFrame() {
  const { notice, dismissNotice } = useCloset()
  const {
    user,
    profile,
    avatarUrl,
    signOut,
    emailVerified,
    openEmailVerify,
    profileError,
    dismissProfileError,
  } = useAuth()
  const { loadError: likesLoadError, dismissLoadError } = useLikes()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const studio = location.pathname === "/studio"
  const { navRef, dockRef, thumb, dockThumb } = useNavThumbs(location.pathname + (from ?? ""))
  useStudioLock(studio)

  const displayName = profile?.username || user?.email?.split("@")[0] || "Player"
  const toast =
    notice != null
      ? { message: notice, onDismiss: dismissNotice }
      : profileError != null
        ? { message: profileError, onDismiss: dismissProfileError }
        : likesLoadError != null
          ? { message: likesLoadError, onDismiss: dismissLoadError }
          : null

  return (
    <div
      className={`bg-base-100 text-base-content ${
        studio ? "flex h-svh flex-col overflow-hidden" : "min-h-svh"
      }`}
    >
      <header className="sticky top-0 z-40 shrink-0 border-b border-base-content/10 bg-base-100/95 backdrop-blur-md">
        <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto] items-center gap-4 px-5 md:grid-cols-[1fr_auto_1fr] lg:px-12">
          <NavLink
            to="/"
            className="flex w-fit shrink-0 items-center justify-self-start rounded-lg outline-offset-4"
            aria-label="looms home"
          >
            <LoomsLogo decorative className="h-8 sm:h-10" />
          </NavLink>
          <nav ref={navRef} className="nav-pills hidden items-center gap-1 justify-self-center md:flex">
            {thumb.ready ? (
              <span
                className="nav-thumb"
                aria-hidden
                style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }}
              />
            ) : null}
            <HeaderPills pathname={location.pathname} from={from} />
          </nav>
          <div className="flex items-center justify-self-end gap-2">
            <ThemeToggle />
            <ShellAuthControls
              user={user}
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
      </header>
      <SiteBanner />

      <main
        className={
          studio
            ? "studio-main mx-auto flex w-full min-h-0 max-w-[1440px] flex-1 flex-col overflow-hidden px-5 py-3 lg:px-12"
            : "mx-auto max-w-[1440px] px-5 py-6 pb-28 lg:px-12"
        }
      >
        <Outlet />
      </main>

      {!studio ? <SiteFooter /> : null}

      <nav ref={dockRef} className="plaza-dock md:hidden" aria-label="Primary">
        {dockThumb.ready ? (
          <span
            className="plaza-dock-thumb"
            aria-hidden
            style={{ transform: `translateX(${dockThumb.x}px)`, width: dockThumb.w }}
          />
        ) : null}
        <DockLinks pathname={location.pathname} from={from} />
      </nav>

      <VerifyEmailModal />
      <CookieBanner />

      {toast ? (
        <div className="toast toast-end z-[60] pb-24 md:pb-6">
          <div className="alert border-0 bg-base-300 text-base-content shadow-none">
            <span className="font-bold">{toast.message}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-full"
              onClick={toast.onDismiss}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
