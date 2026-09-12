import { EmptyState } from "../../components/ui/EmptyState"
import { Button, ButtonLink } from "../../components/ui/Button"

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
  const action = to ? (
    <ButtonLink to={to} variant="primary" className="mt-4 font-extrabold">
      {cta}
    </ButtonLink>
  ) : (
    <Button variant="primary" className="mt-4 font-extrabold" onClick={onClick}>
      {cta}
    </Button>
  )
  return <EmptyState title={title} body={body} action={action} />
}
