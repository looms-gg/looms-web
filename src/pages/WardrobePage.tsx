import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CloudArrowUp } from "@phosphor-icons/react"
import { Icon } from "../components/ui/Icon"
import { UploadPieceModal } from "../components/piece/UploadPieceModal"
import { useCloset } from "../state/closet"
import { useCatalog } from "../state/catalog"
import { useAuth } from "../state/auth"
import { parseWardrobeTab, type WardrobeTab } from "./wardrobeTab"
import { WardrobeLooksPanel } from "./wardrobe/WardrobeLooksPanel"
import { WardrobePiecesPanel } from "./wardrobe/WardrobePiecesPanel"
import { WardrobeUploadsPanel } from "./wardrobe/WardrobeUploadsPanel"

const TABS: { id: WardrobeTab; label: string }[] = [
  { id: "looks", label: "Looks" },
  { id: "pieces", label: "Pieces" },
  { id: "uploads", label: "My Uploads" },
]

export function WardrobePage() {
  const { user } = useAuth()
  const { looks } = useCloset()
  const { pieces } = useCatalog()
  const [params, setParams] = useSearchParams()
  const urlTab = parseWardrobeTab(params.toString())
  const [optimisticTab, setOptimisticTab] = useState<WardrobeTab | null>(null)

  useEffect(() => {
    if (optimisticTab != null && optimisticTab === urlTab) {
      setOptimisticTab(null)
    }
  }, [optimisticTab, urlTab])

  const tab = optimisticTab ?? urlTab
  const [uploadOpen, setUploadOpen] = useState(false)

  const myUploads = useMemo(() => {
    if (!user) return []
    return pieces.filter((p) => p.userId === user.id)
  }, [pieces, user])

  function selectTab(next: WardrobeTab) {
    setOptimisticTab(next)
    setParams({ tab: next })
  }

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
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`btn btn-sm rounded-full font-extrabold ${tab === id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => selectTab(id)}
              >
                {label}
                {id === "uploads" && myUploads.length > 0 && (
                  <span className="badge badge-xs badge-neutral ml-1 tabular-nums">
                    {myUploads.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="btn btn-outline btn-sm rounded-full font-bold"
          >
            <Icon icon={CloudArrowUp} className="size-3.5 mr-1.5" />
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
          onUpload={() => setUploadOpen(true)}
        />
      ) : null}

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
