import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CloudArrowUp } from "@phosphor-icons/react"
import { Icon } from "../components/ui/Icon"
import { UploadPieceModal } from "../components/piece/UploadPieceModal"
import { useWardrobe } from "../state/wardrobe"
import { useCatalog } from "../state/catalog"
import { useAuth } from "../state/auth"
import { parseWardrobeTab, type WardrobeTab } from "./wardrobe/wardrobeTab"
import { WardrobeLooksPanel } from "./wardrobe/WardrobeLooksPanel"
import { WardrobePiecesPanel } from "./wardrobe/WardrobePiecesPanel"
import { WardrobeUploadsPanel } from "./wardrobe/WardrobeUploadsPanel"

const TABS: { id: WardrobeTab; label: string }[] = [
  { id: "pieces", label: "Pieces" },
  { id: "looks", label: "Looks" },
  { id: "uploads", label: "My Uploads" },
]

interface WardrobeTabButtonProps {
  id: WardrobeTab
  label: string
  isActive: boolean
  badgeCount?: number
  onSelect: (id: WardrobeTab) => void
}

function WardrobeTabButton({
  id,
  label,
  isActive,
  badgeCount,
  onSelect,
}: WardrobeTabButtonProps) {
  const handleClick = () => onSelect(id)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`btn btn-sm btn-pill font-extrabold ${isActive ? "btn-primary" : "btn-ghost"}`}
      onClick={handleClick}
    >
      {label}
      {badgeCount != null && badgeCount > 0 && (
        <span className="badge badge-xs badge-neutral ml-1 tabular-nums">
          {badgeCount}
        </span>
      )}
    </button>
  )
}

function useWardrobeTabState() {
  const [params, setParams] = useSearchParams()
  const urlTab = parseWardrobeTab(params.toString())
  const [optimisticTab, setOptimisticTab] = useState<WardrobeTab | null>(null)

  useEffect(() => {
    if (optimisticTab != null && optimisticTab === urlTab) {
      setOptimisticTab(null)
    }
  }, [optimisticTab, urlTab])

  const tab = optimisticTab ?? urlTab

  function selectTab(next: WardrobeTab) {
    setOptimisticTab(next)
    setParams({ tab: next })
  }

  return { tab, selectTab }
}

export function WardrobePage() {
  const { user } = useAuth()
  const { looks } = useWardrobe()
  const { pieces } = useCatalog()
  const { tab, selectTab } = useWardrobeTabState()
  const [uploadOpen, setUploadOpen] = useState(false)

  const myUploads = useMemo(() => {
    if (!user) return []
    return pieces.filter((p) => p.userId === user.id)
  }, [pieces, user])

  const handleOpenUpload = () => setUploadOpen(true)
  const handleCloseUpload = () => setUploadOpen(false)

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] bg-base-200 p-5 md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Wardrobe</h1>
        <p className="mt-1 max-w-xl text-base-content/70">
          Saved characters and pieces you own.
        </p>
        <div
          role="tablist"
          aria-label="Wardrobe sections"
          className="mt-4 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex flex-wrap gap-2">
            {TABS.map(({ id, label }) => (
              <WardrobeTabButton
                key={id}
                id={id}
                label={label}
                isActive={tab === id}
                badgeCount={id === "uploads" ? myUploads.length : undefined}
                onSelect={selectTab}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleOpenUpload}
            className="btn btn-outline btn-sm rounded-full font-bold"
          >
            <Icon icon={CloudArrowUp} size="sm" className="mr-1.5" />
            Upload piece
          </button>
        </div>
      </section>

      {tab === "looks" && <WardrobeLooksPanel looks={looks} />}
      {tab === "pieces" && <WardrobePiecesPanel />}
      {tab === "uploads" && user ? (
        <WardrobeUploadsPanel
          user={user}
          myUploads={myUploads}
          onUpload={handleOpenUpload}
        />
      ) : null}

      <UploadPieceModal isOpen={uploadOpen} onClose={handleCloseUpload} />
    </div>
  )
}
