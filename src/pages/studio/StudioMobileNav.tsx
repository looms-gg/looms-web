import type { ReactElement } from "react"

export type MobileStage = "preview" | "pieces" | "layers"

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
    </svg>
  )
}

function PiecesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

const TABS: { stage: MobileStage; label: string; Icon: () => ReactElement }[] = [
  { stage: "preview", label: "Preview", Icon: PreviewIcon },
  { stage: "pieces", label: "Pieces", Icon: PiecesIcon },
  { stage: "layers", label: "Layers", Icon: LayersIcon },
]

export function StudioMobileNav({
  stage,
  onStage,
}: {
  stage: MobileStage
  onStage: (s: MobileStage) => void
}) {
  return (
    <nav className="studio-mobile-nav" aria-label="Studio sections">
      {TABS.map(({ stage: s, label, Icon }) => (
        <button
          key={s}
          type="button"
          data-testid={`studio-mobile-tab-${s}`}
          aria-pressed={stage === s}
          aria-label={label}
          className={`studio-mobile-tab${stage === s ? " studio-mobile-tab--active" : ""}`}
          onClick={() => onStage(s)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  )
}
