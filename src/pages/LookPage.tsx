import { useEffect, useState, type CSSProperties } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"
import { useWardrobe } from "../state/wardrobe"
import {
  DEFAULT_FEATURED_LOOKS,
  fetchLookById,
  publicLookToLook,
  type PublicLook,
} from "../state/publicLooks"
import { equippedFromStack, piecesFromEquipped } from "../data/outfit"
import { HeadMeta } from "../components/shell/HeadMeta"
import {
  creativeWorkJsonLd,
  lookCanonicalUrl,
  lookSeoDescription,
  lookSeoTitle,
} from "../lib/seo"
import { tryDownloadSkinFile } from "../skin/compose"
import { CommentsSection } from "../components/comments/CommentsSection"
import { AuthModal } from "../components/auth/AuthModal"
import { useAuthOptional } from "../state/auth"
import { setPendingAction } from "../lib/pendingAction"
import { LookSheet } from "./look/LookSheet"
import { PieceSkeleton } from "./piece/PieceSkeleton"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

export function LookPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { loadLook, notify } = useWardrobe()

  const [look, setLook] = useState<PublicLook | null>(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" })
      } catch {
        // ignore
      }
      if (document.documentElement) document.documentElement.scrollTop = 0
      if (document.body) document.body.scrollTop = 0
    }
  }, [id, location.key])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    // Check if it's one of the default featured looks first
    const defaultLook = DEFAULT_FEATURED_LOOKS.find((l) => l.id === id)
    if (defaultLook) {
      setLook(defaultLook)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void fetchLookById(id)
      .then((res) => {
        if (active) {
          setLook(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const stateFrom = (location.state as { from?: string } | null)?.from
  const backTo = stateFrom || "/"
  const backLabel = stateFrom?.startsWith("/wardrobe")
    ? "← Wardrobe"
    : stateFrom?.startsWith("/u/")
    ? "← Profile"
    : "← Explore"

  if (loading) {
    return <PieceSkeleton />
  }

  if (!look) {
    return <Navigate to="/" replace />
  }

  const outfit = piecesFromEquipped(equippedFromStack(look.stack), look.stack)
  const shareUrl = lookCanonicalUrl(look.id)
  const metaDesc = lookSeoDescription(look)

  const handleWear = () => {
    if (!user) {
      // Remember the outfit so it loads into Studio after sign-up confirms.
      setPendingAction({ action: "wearLook", lookId: id })
      setAuthOpen(true)
      return
    }
    loadLook(publicLookToLook(look))
    void navigate("/studio")
  }

  const handleDownload = async () => {
    const ok = await tryDownloadSkinFile(
      outfit,
      look.bodyId,
      look.bodyHue,
      look.name.trim() || "looms-look",
      look.model,
    )
    if (!ok) notify("Couldn't export that skin.")
  }

  return (
    <div className="space-y-6">
      <HeadMeta
        title={lookSeoTitle(look)}
        description={metaDesc}
        url={shareUrl}
        image={`https://looms.gg/og/outfit-default.png`}
        // Indexation quality gate: only public looks may be indexed; private
        // or unlisted outfits stay crawlable for the owner but out of search.
        index={look.visibility === "public"}
        jsonLd={creativeWorkJsonLd({
          name: look.name,
          description: metaDesc,
          url: shareUrl,
          image: `https://looms.gg/og/outfit-default.png`,
        })}
      />
      <Link
        to={backTo}
        className="piece-reveal link inline-flex min-h-11 items-center text-sm font-bold text-primary no-underline"
        style={revealStyle(0)}
      >
        {backLabel}
      </Link>

      <LookSheet
        look={look}
        outfit={outfit}
        onLikeCountChange={(nextCount) => setLook((prev) => (prev ? { ...prev, likeCount: nextCount } : null))}
        onWear={handleWear}
        onDownload={() => void handleDownload()}
      />

      <CommentsSection
        targetType="look"
        targetId={look.id}
        ownerId={look.userId}
        isPublic={look.visibility === "public"}
      />

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
