import { Eye, SquaresFour, Stack } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"

export type MobileStage = "preview" | "pieces" | "layers"

const TABS: { stage: MobileStage; label: string; icon: typeof Eye }[] = [
  { stage: "preview", label: "Preview", icon: Eye },
  { stage: "pieces", label: "Pieces", icon: SquaresFour },
  { stage: "layers", label: "Layers", icon: Stack },
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
      {TABS.map(({ stage: s, label, icon }) => (
        <button
          key={s}
          type="button"
          data-testid={`studio-mobile-tab-${s}`}
          aria-pressed={stage === s}
          aria-label={label}
          className={`studio-mobile-tab${stage === s ? " studio-mobile-tab--active" : ""}`}
          onClick={() => onStage(s)}
        >
          <Icon icon={icon} />
          {label}
        </button>
      ))}
    </nav>
  )
}
