import { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import {
  Package,
  SignOut,
  ShieldCheck,
  User,
  Sparkle,
  Gear,
} from "@phosphor-icons/react"
import { AuthButtons } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"
import { isAdmin } from "../../lib/admin"

export function ShellAccountMenu({
  userId,
  displayName,
  username,
  minecraftUsername,
  avatarUrl,
  onSignOut,
}: {
  userId?: string | null
  displayName: string
  username?: string | null
  minecraftUsername?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  function closeMenu() {
    if (typeof document !== "undefined") {
      const focused = menuRef.current?.querySelectorAll<HTMLElement>(":focus")
      focused?.forEach((el) => el.blur())
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }
    setOpen(false)
  }

  const initials = displayName[0].toUpperCase()

  return (
    <div ref={rootRef} className="account-menu-root">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User profile"
        title="User profile"
        className="btn btn-ghost btn-xs sm:btn-sm rounded-full font-bold gap-2 px-2.5 sm:px-3 border border-white/10 bg-base-200/50 hover:bg-base-200 active:scale-[0.96] transition-transform"
        onClick={() => setOpen((v) => !v)}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-5 rounded-md"
            style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
          />
        ) : (
          <span className="grid size-5 place-items-center rounded-md bg-primary/25 text-primary text-[10px] font-black">
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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="account-menu-avatar"
              style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
            />
          ) : (
            <span className="account-menu-avatar-fallback">{initials}</span>
          )}
          <div className="account-menu-identity">
            <span className="account-menu-name truncate">{displayName}</span>
            {minecraftUsername ? (
              <span className="account-menu-mc truncate">MC: {minecraftUsername}</span>
            ) : null}
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
              Profile
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
            <Icon icon={Sparkle} className="account-menu-item-icon" />
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
          {isAdmin(userId) ? (
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
  displayName,
  username,
  minecraftUsername,
  avatarUrl,
  emailVerified,
  onOpenEmailVerify,
  onSignOut,
}: {
  user: unknown
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
          className="btn btn-ghost btn-xs sm:btn-sm rounded-full font-bold text-primary"
          onClick={onOpenEmailVerify}
        >
          Confirm email
        </button>
      ) : null}
      {user ? (
        <ShellAccountMenu
          userId={(user as { id?: string })?.id}
          displayName={displayName}
          username={username}
          minecraftUsername={minecraftUsername}
          avatarUrl={avatarUrl}
          onSignOut={onSignOut}
        />
      ) : (
        <AuthButtons />
      )}
    </>
  )
}
