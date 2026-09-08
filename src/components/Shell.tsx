import { NavLink, Outlet, useLocation } from "react-router-dom"
import { faBoxOpen, faRightFromBracket, faShirt, faUser, faWandSparkles } from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { useSession } from "../state/closet"
import { useAuth } from "../state/auth"
import { CookieConsentProvider } from "../state/cookieConsent"
import { AuthButtons } from "./AuthModal"
import { CookieBanner } from "./CookieBanner"
import { FaIcon } from "./FaIcon"
import { IsoFigureFx } from "./IsoFigureFx"
import { LoomsLogo } from "./LoomsLogo"
import { SiteFooter } from "./SiteFooter"
import { ThemeToggle } from "./ThemeToggle"
import { VerifyEmailModal } from "./VerifyEmailModal"
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
  const { notice, dismissNotice } = useSession()
  const { user, profile, avatarUrl, signOut, emailVerified, openEmailVerify } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const studio = location.pathname === "/studio"
  const { navRef, dockRef, thumb, dockThumb } = useNavThumbs(location.pathname + (from ?? ""))
  useStudioLock(studio)

  const displayName = profile?.username || user?.email?.split("@")[0] || "Player"

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
            {user && !emailVerified ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs sm:btn-sm rounded-full font-bold text-primary"
                onClick={openEmailVerify}
              >
                Confirm email
              </button>
            ) : null}
            <ThemeToggle />
            {user ? (
              <div className="dropdown dropdown-end">
                <button
                  type="button"
                  tabIndex={0}
                  className="btn btn-ghost btn-xs sm:btn-sm rounded-full font-bold gap-2 px-2.5 sm:px-3 border border-white/10 bg-base-200/50 hover:bg-base-200"
                  title="User profile"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-5 rounded-md border border-white/10 shadow-2xs"
                    />
                  ) : (
                    <span className="grid size-5 place-items-center rounded-md bg-primary/25 text-primary text-[10px] font-black">
                      {displayName[0].toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[80px] sm:max-w-[130px] truncate">{displayName}</span>
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu z-50 mt-2 w-52 rounded-2xl bg-base-300 p-2 shadow-xl border border-base-content/10"
                >
                  <li className="menu-title text-xs text-base-content/60 px-3 py-1.5">
                    Signed in as <span className="font-extrabold text-base-content truncate">{displayName}</span>
                    {profile?.minecraft_username ? (
                      <span className="text-[11px] text-primary block mt-0.5">
                        MC: {profile.minecraft_username}
                      </span>
                    ) : null}
                  </li>
                  <li>
                    {profile?.username ? (
                      <NavLink to={`/u/${encodeURIComponent(profile.username)}`} className="font-medium">
                        <FaIcon icon={faUser} className="size-3.5" />
                        Profile
                      </NavLink>
                    ) : null}
                  </li>
                  <li>
                    <NavLink to="/wardrobe" className="font-medium">
                      <FaIcon icon={faBoxOpen} className="size-3.5" />
                      Wardrobe
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/studio" className="font-medium">
                      <FaIcon icon={faWandSparkles} className="size-3.5" />
                      Studio
                    </NavLink>
                  </li>
                  <li className="border-t border-base-content/10 mt-1 pt-1">
                    <button
                      type="button"
                      className="text-error font-bold"
                      onClick={() => signOut()}
                    >
                      <FaIcon icon={faRightFromBracket} className="size-3.5" />
                      Log out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </header>

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

      <IsoFigureFx />

      <CookieBanner />

      {notice ? (
        <div className="toast toast-end z-[60] pb-24 md:pb-6">
          <div className="alert border-0 bg-base-300 text-base-content shadow-none">
            <span className="font-bold">{notice}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-full"
              onClick={dismissNotice}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
