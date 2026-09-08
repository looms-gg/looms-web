import { NavLink } from "react-router-dom"
import {
  faBoxOpen,
  faRightFromBracket,
  faUser,
  faWandSparkles,
} from "@fortawesome/free-solid-svg-icons"
import { AuthButtons } from "../auth/AuthModal"
import { FaIcon } from "../ui/FaIcon"

export function ShellAccountMenu({
  displayName,
  username,
  minecraftUsername,
  avatarUrl,
  onSignOut,
}: {
  displayName: string
  username?: string | null
  minecraftUsername?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
}) {
  return (
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
          Signed in as{" "}
          <span className="font-extrabold text-base-content truncate">{displayName}</span>
          {minecraftUsername ? (
            <span className="text-[11px] text-primary block mt-0.5">MC: {minecraftUsername}</span>
          ) : null}
        </li>
        <li>
          {username ? (
            <NavLink to={`/u/${encodeURIComponent(username)}`} className="font-medium">
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
          <button type="button" className="text-error font-bold" onClick={onSignOut}>
            <FaIcon icon={faRightFromBracket} className="size-3.5" />
            Log out
          </button>
        </li>
      </ul>
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
