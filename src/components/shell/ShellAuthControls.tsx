import { useCallback, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { useDismissable } from "./useDismissable"
import {
  Package,
  SignOut,
  ShieldCheck,
  User,
  PaintBrush,
  Gear,
} from "@phosphor-icons/react"
import { AuthButtons } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"

export function ShellAccountMenu({
  isAdmin,
  displayName,
  username,
  minecraftUsername,
  avatarUrl,
  onSignOut,
}: {
  isAdmin?: boolean
  displayName: string
  username?: string | null
  minecraftUsername?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => {
    if (typeof document !== "undefined") {
      const focused = menuRef.current?.querySelectorAll<HTMLElement>(":focus")
      focused?.forEach((el) => el.blur())
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }
    setOpen(false)
  }, [])

  useDismissable(open, rootRef, closeMenu)

  const initials = displayName[0].toUpperCase()

  return (
    <div ref={rootRef} className="account-menu-root">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User profile"
        title="User profile"
        className="btn btn-ghost btn-xs sm:btn-sm font-bold gap-2 px-2.5 sm:px-3 rounded-lg border border-base-content/12 bg-base-300/60 hover:bg-base-300 active:scale-[0.96] transition-transform"
        onClick={() => setOpen((v) => !v)}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-5 rounded-md"
            style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }} />
        ) : (
          <span className="grid size-5 place-items-center rounded-md bg-primary/25 text-primary text-[10px] font-extrabold">
            {initials}
          </span>
        )}
        <span className="max-w-[80px] sm:max-w-[130px] truncate">{displayName}</span>
      </button>

      <div
        ref={menuRef}
        data-open={open}
        className="account-menu-panel"
        role="menu"
        aria-label="Account menu"
        onClick={(e) => {
          const target = e.target as HTMLElement | null
          if (target?.closest("a, button")) closeMenu()
        }}
      >
        {/* Identity header */}
        <div className="account-menu-header">
          <div className="account-menu-identity">
            <span className="account-menu-name truncate">{displayName}</span>
            <span className="account-menu-mc truncate">
              {minecraftUsername ? "Minecraft Account" : "looms Account"}
            </span>
          </div>
        </div>

        <div className="account-menu-divider" />

        {/* Navigation items */}
        <nav className="account-menu-nav">
          {username ? (
            <NavLink
              to={`/u/${encodeURIComponent(username)}`}
              className="account-menu-item"
              style={{ "--item-i": 0 } as React.CSSProperties}
              role="menuitem"
            >
              <Icon icon={User} className="account-menu-item-icon" />
              View Profile
            </NavLink>
          ) : null}
          <NavLink
            to="/wardrobe"
            className="account-menu-item"
            style={{ "--item-i": 1 } as React.CSSProperties}
            role="menuitem"
          >
            <Icon icon={Package} className="account-menu-item-icon" />
            Wardrobe
          </NavLink>
          <NavLink
            to="/studio"
            className="account-menu-item"
            style={{ "--item-i": 2 } as React.CSSProperties}
            role="menuitem"
          >
            <Icon icon={PaintBrush} className="account-menu-item-icon" />
            Studio
          </NavLink>
          <NavLink
            to="/settings"
            className="account-menu-item"
            style={{ "--item-i": 3 } as React.CSSProperties}
            role="menuitem"
          >
            <Icon icon={Gear} className="account-menu-item-icon" />
            Settings
          </NavLink>
          {isAdmin ? (
            <NavLink
              to="/admin"
              className="account-menu-item account-menu-item-admin"
              style={{ "--item-i": 4 } as React.CSSProperties}
              role="menuitem"
            >
              <Icon icon={ShieldCheck} className="account-menu-item-icon" />
              Admin Panel
            </NavLink>
          ) : null}
        </nav>

        <div className="account-menu-divider" />

        <div className="account-menu-footer">
          <button
            type="button"
            className="account-menu-item account-menu-item-danger"
            style={{ "--item-i": 5 } as React.CSSProperties}
            role="menuitem"
            onClick={() => {
              closeMenu()
              onSignOut()
            }}
          >
            <Icon icon={SignOut} className="account-menu-item-icon" />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShellAuthControls({
  user,
  isAdmin,
  displayName,
  username,
  minecraftUsername,
  avatarUrl,
  emailVerified,
  onOpenEmailVerify,
  onSignOut,
}: {
  user: unknown
  isAdmin?: boolean
  displayName: string
  username?: string | null
  minecraftUsername?: string | null
  avatarUrl?: string | null
  emailVerified: boolean
  onOpenEmailVerify: () => void
  onSignOut: () => void
}) {
  return (
    <>
      {user && !emailVerified ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs sm:btn-sm font-bold text-primary"
          onClick={onOpenEmailVerify}
        >
          Confirm email
        </button>
      ) : null}
      {user ? (
        <ShellAccountMenu
          isAdmin={isAdmin}
          displayName={displayName}
          username={username}
          minecraftUsername={minecraftUsername}
          avatarUrl={avatarUrl}
          onSignOut={onSignOut} />
      ) : (
        <AuthButtons />
      )}
    </>
  )
}
