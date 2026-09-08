import { useMemo, useState, type CSSProperties } from "react"
import { useNavigate } from "react-router-dom"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { SLOTS } from "../../data/catalog"
import { piecesFromEquipped } from "../../data/outfit"
import { FaIcon } from "../../components/ui/FaIcon"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { RackGrid } from "../../components/piece/RackGrid"
import { MAX_LIMITS } from "../../lib/sanitize"
import { useCloset, type Look } from "../../state/closet"
import { LookInspector } from "./LookInspector"
import { InspectorModal } from "./InspectorModal"
import { WardrobeEmpty } from "./WardrobeEmpty"

export function WardrobeLooksPanel({ looks }: { looks: Look[] }) {
  const { loadLook } = useCloset()
  const navigate = useNavigate()
  const [lookQuery, setLookQuery] = useState("")
  const [inspectedLookId, setInspectedLookId] = useState<string | null>(null)
  const inspectedLook = looks.find((look) => look.id === inspectedLookId) ?? null

  const filteredLooks = useMemo(() => {
    const q = lookQuery.trim().toLowerCase()
    if (!q) return looks
    return looks.filter(
      (look) =>
        look.name.toLowerCase().includes(q) ||
        (look.description ?? "").toLowerCase().includes(q),
    )
  }, [lookQuery, looks])

  return (
    <>
      <div role="tabpanel">
        {looks.length === 0 ? (
          <WardrobeEmpty
            title="No looks yet"
            body="Wear a few layers in Studio and save the combo. It lands here."
            to="/studio"
            cta="Open studio"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-base-content/60">
                <span className="tabular-nums">{looks.length}</span>{" "}
                {looks.length === 1 ? "look" : "looks"}
              </p>
              <div className="w-full sm:max-w-xs">
                <label className="input input-bordered flex h-10 items-center gap-2 rounded-full bg-base-100">
                  <FaIcon icon={faMagnifyingGlass} className="size-3.5 opacity-50" />
                  <input
                    type="search"
                    maxLength={MAX_LIMITS.SEARCH_QUERY}
                    className="grow border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
                    placeholder="Search looks..."
                    aria-label="Search looks"
                    value={lookQuery}
                    onChange={(event) =>
                      setLookQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))
                    }
                  />
                </label>
              </div>
            </div>

            {filteredLooks.length === 0 ? (
              <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center">
                <p className="text-base font-extrabold">No looks match</p>
                <p className="mt-1 text-sm text-base-content/65">
                  No saved looks match your search.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-4 rounded-full font-extrabold"
                  onClick={() => setLookQuery("")}
                >
                  Reset search
                </button>
              </div>
            ) : (
              <RackGrid>
                {filteredLooks.map((look, i) => {
                  const isOpen = look.id === inspectedLookId
                  return (
                    <button
                      key={look.id}
                      type="button"
                      aria-pressed={isOpen}
                      className={`look-tile rack-cell piece-tile tile-lift bg-base-200 text-left ${
                        isOpen ? "look-tile-on" : ""
                      }`}
                      style={{ "--i": Math.min(i, 9) } as CSSProperties}
                      onClick={() => setInspectedLookId(look.id)}
                    >
                      <IsoThumb
                        outfit={piecesFromEquipped(look.equipped, look.stack)}
                        bodyId={look.bodyId}
                        bodyHue={look.bodyHue}
                        model={look.model ?? "classic"}
                        alt={look.name}
                      />
                      <div className="bg-neutral px-4 py-3 min-w-0">
                        <h3
                          className="truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold"
                          title={look.name}
                        >
                          {look.name}
                        </h3>
                        <p className="text-sm font-semibold text-primary">
                          <span className="tabular-nums">
                            {SLOTS.filter((slot) => look.equipped[slot]).length}
                          </span>{" "}
                          layers
                        </p>
                      </div>
                    </button>
                  )
                })}
              </RackGrid>
            )}
          </div>
        )}
      </div>

      <InspectorModal
        open={Boolean(inspectedLook)}
        title={inspectedLook?.name ?? "Look"}
        onClose={() => setInspectedLookId(null)}
      >
        {inspectedLook ? (
          <LookInspector
            look={inspectedLook}
            onEditOutfit={() => {
              loadLook(inspectedLook)
              void navigate("/studio")
            }}
          />
        ) : null}
      </InspectorModal>
    </>
  )
}
