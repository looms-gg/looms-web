import { useState, type CSSProperties } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useWardrobe } from "../state/wardrobe"
import { publicLookToLook, type PublicLook } from "../state/publicLooks"
import { equippedFromStack, piecesFromEquipped } from "../data/outfit"
import { HeadMeta } from "../components/shell/HeadMeta"
import {
  creativeWorkJsonLd,
  lookCanonicalUrl,
  lookSeoDescription,
  lookSeoTitle,
  SITE_ORIGIN,
} from "../lib/content/seo"
import { tryDownloadSkinFile } from "../skin/compose"
import { CommentsSection } from "../components/comments/CommentsSection"
import { AuthModal } from "../components/auth/AuthModal"
import { useAuthOptional } from "../state/auth"
import { setPendingAction } from "../lib/pendingAction"
import { EmptyState } from "../components/ui/EmptyState"
import { ButtonLink } from "../components/ui/Button"
import { LookSheet } from "./look/LookSheet"
import { useLook } from "./look/useLook"
import { PieceSkeleton } from "./piece/PieceSkeleton"
import { resolveBackLink, useScrollToTop } from "./detailShared"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

function LookPageMeta({ look }: { look: PublicLook }) {
  const shareUrl = lookCanonicalUrl(look.id)
  const metaDesc = lookSeoDescription(look)
  const ogImage = `${SITE_ORIGIN}/og/outfit-default.png`

  return (
    <HeadMeta
      title={lookSeoTitle(look)}
      description={metaDesc}
      url={shareUrl}
      image={ogImage}
      // Indexation quality gate: only public looks may be indexed; private
      // or unlisted outfits stay crawlable for the owner but out of search.
      index={look.visibility === "public"}
      jsonLd={creativeWorkJsonLd({
        name: look.name,
        description: metaDesc,
        url: shareUrl,
        image: ogImage,
      })}
    />
  )
}

function LookNotFound({ error }: { error: string | null }) {
  return (
    <div className="mx-auto max-w-md py-16">
      <EmptyState
        title={error ? "Couldn't load this look" : "Look not found"}
        body={error ?? "This look may have been removed, or the link is wrong."}
        action={
          <ButtonLink to="/" variant="primary" className="mt-4 font-extrabold">
            Explore looks
          </ButtonLink>
        }
      />
    </div>
  )
}

export function LookPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { loadLook, notify } = useWardrobe()

  const { look, setLook, loading, error } = useLook(id)
  const [authOpen, setAuthOpen] = useState(false)

  useScrollToTop(location.key, id)

  if (loading) {
    return <PieceSkeleton />
  }

  if (!look) {
    return <LookNotFound error={error} />
  }

  const { to: backTo, label: backLabel } = resolveBackLink(location.state)
  const outfit = piecesFromEquipped(equippedFromStack(look.stack), look.stack)

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
      look.model,
      { filename: look.name.trim() || "looms-look" },
    )
    if (!ok) notify("Couldn't export that skin.")
  }

  return (
    <div className="space-y-4">
      <LookPageMeta look={look} />
      <Link
        to={backTo}
        className="piece-reveal link inline-flex min-h-11 items-center gap-0.5 text-sm font-bold text-base-content/70 no-underline transition-colors duration-150 hover:text-primary"
        style={revealStyle(0)}
      >
        {backLabel}
      </Link>

      <LookSheet
        look={look}
        outfit={outfit}
        onLikeCountChange={(nextCount) =>
          setLook((prev) => (prev ? { ...prev, likeCount: nextCount } : null))
        }
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
