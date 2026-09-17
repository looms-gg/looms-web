import { Eye, EyeSlash } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import type { LimbId, SkinEditorState } from "./useSkinEditor"

export interface DesktopPartFilterProps {
  editor: SkinEditorState
  className?: string
}

interface PartLayout {
  id: LimbId
  label: string
  col: string
  row: string
}

// Viewer perspective (character facing forward)
const MANNEQUIN_PARTS: PartLayout[] = [
  { id: "head", label: "Head", col: "2 / 4", row: "1" },
  { id: "leftArm", label: "Left Arm", col: "1", row: "2" },
  { id: "body", label: "Torso", col: "2 / 4", row: "2" },
  { id: "rightArm", label: "Right Arm", col: "4", row: "2" },
  { id: "leftLeg", label: "Left Leg", col: "2", row: "3" },
  { id: "rightLeg", label: "Right Leg", col: "3", row: "3" },
]

export function DesktopPartFilter({ editor, className = "" }: DesktopPartFilterProps) {
  const { data: visibilityData } = editor.visibility
  const { bodyParts, armorParts } = visibilityData

  const {
    toggleBodyPart,
    toggleArmorPart,
    toggleAllBody,
    toggleAllArmor,
  } = editor.visibility

  const anyBodyVisible = Object.values(bodyParts).some(Boolean)
  const anyArmorVisible = Object.values(armorParts).some(Boolean)

  return (
    <div data-tutorial-id="desktop-part-filter" className={`flex justify-around gap-3 select-none ${className}`}>
      {/* Layer 1 Column (Inner Layer) */}
      <div className="group pointer-events-auto flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-semibold text-base-content/70">
          Layer 1
        </span>

        <div
          dir="ltr"
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: "repeat(4, 10px)",
            gridTemplateRows: "20px 30px 30px",
          }}
          role="group"
          aria-label="Layer 1 limb visibility"
        >
          {MANNEQUIN_PARTS.map((p) => {
            const visible = bodyParts[p.id]
            return (
              <button
                key={`body-${p.id}`}
                type="button"
                onClick={() => toggleBodyPart(p.id)}
                style={{ gridColumn: p.col, gridRow: p.row }}
                aria-pressed={visible}
                aria-label={`Toggle Layer 1 ${p.label}`}
                title={`Toggle Layer 1 ${p.label}`}
                className={`pointer-events-auto box-border cursor-pointer rounded-[3px] border transition-all hover:ring-2 hover:ring-primary/50 ${
                  visible
                    ? "border-base-content/80 bg-base-content/60"
                    : "border-base-content/20 bg-transparent opacity-40 hover:opacity-75"
                }`}
              />
            )
          })}
        </div>

        {/* Toggle All Layer 1 */}
        <button
          type="button"
          onClick={toggleAllBody}
          aria-label="Toggle whole layer (Layer 1)"
          title="Toggle whole layer"
          className="pointer-events-auto flex h-5 w-6 cursor-pointer items-center justify-center rounded-full border border-base-content/15 bg-base-200 text-base-content/70 hover:text-base-content opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Icon icon={anyBodyVisible ? Eye : EyeSlash} size="xs" />
        </button>
      </div>

      {/* Layer 2 Column (Outer Layer) */}
      <div className="group pointer-events-auto flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-semibold text-base-content/70">
          Layer 2
        </span>

        <div
          dir="ltr"
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: "repeat(4, 10px)",
            gridTemplateRows: "20px 30px 30px",
          }}
          role="group"
          aria-label="Layer 2 limb visibility"
        >
          {MANNEQUIN_PARTS.map((p) => {
            const visible = armorParts[p.id]
            return (
              <button
                key={`armor-${p.id}`}
                type="button"
                onClick={() => toggleArmorPart(p.id)}
                style={{ gridColumn: p.col, gridRow: p.row }}
                aria-pressed={visible}
                aria-label={`Toggle Layer 2 ${p.label}`}
                title={`Toggle Layer 2 ${p.label}`}
                className={`pointer-events-auto box-border cursor-pointer rounded-[3px] border transition-all hover:ring-2 hover:ring-primary/50 ${
                  visible
                    ? "border-primary bg-primary"
                    : "border-base-content/20 bg-transparent opacity-40 hover:opacity-75"
                }`}
              />
            )
          })}
        </div>

        {/* Toggle All Layer 2 */}
        <button
          type="button"
          onClick={toggleAllArmor}
          aria-label="Toggle whole layer (Layer 2)"
          title="Toggle whole layer"
          className="pointer-events-auto flex h-5 w-6 cursor-pointer items-center justify-center rounded-full border border-base-content/15 bg-base-200 text-base-content/70 hover:text-base-content opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Icon icon={anyArmorVisible ? Eye : EyeSlash} size="xs" />
        </button>
      </div>
    </div>
  )
}
