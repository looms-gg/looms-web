import { Link } from "react-router-dom"

export function WardrobeEmpty({
  title,
  body,
  to,
  cta,
  onClick,
}: {
  title: string
  body: string
  to?: string
  cta: string
  onClick?: () => void
}) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-14 text-center">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-base-content/65">{body}</p>
      {to ? (
        <Link to={to} className="btn btn-primary mt-4 rounded-full font-extrabold">
          {cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="btn btn-primary mt-4 rounded-full font-extrabold"
        >
          {cta}
        </button>
      )}
    </div>
  )
}
