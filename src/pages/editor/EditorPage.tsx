import { MagicWand } from "@phosphor-icons/react"

function Bone({ className = "", rounded = "rounded-lg" }: { className?: string; rounded?: string }) {
  return <div aria-hidden className={`editor-bone ${rounded} ${className}`} />
}

/**
 * Editor — under construction.
 *
 * A teaser, not a workspace: a static skeleton preview of the planned tool
 * (pure blobs, no text/icons inside it) and a short centered note underneath
 * explaining what will ship and when.
 */
export function EditorPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-4">
      {/* Skeleton mockup of the future editor workspace (4:3) */}
      <div
        className="editor-frame mx-auto aspect-[4/3] w-full max-w-[24rem] rounded-[18px] bg-base-200 p-3"
        role="img"
        aria-label="Preview of the upcoming looms editor under construction: an empty canvas with tool columns on both sides and a timeline along the bottom."
      >
        <div className="flex h-full gap-3" aria-hidden>
          {/* Left tool rail */}
          <div className="flex w-12 shrink-0 flex-col gap-2 rounded-[14px] bg-base-300/70 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Bone key={i} className="aspect-square w-full" rounded="rounded-xl" />
            ))}
          </div>

          {/* Canvas + timeline */}
          <div className="relative flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative flex-1 rounded-[14px] bg-base-300/70 p-4">
              {/* Zoom pill with an inline dot */}
              <div className="absolute bottom-4 right-4 flex h-6 items-center gap-1.5 rounded-full bg-base-200/70 px-2">
                <Bone className="size-2.5" rounded="rounded-full" />
              </div>
            </div>

            {/* Timeline strip */}
            <div className="flex items-center gap-2 rounded-[14px] bg-base-300/70 p-3">
              <Bone className="h-6 w-6 shrink-0" rounded="rounded-md" />
              <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Bone key={i} className="h-3.5 flex-1" rounded="rounded-full" />
                ))}
              </div>
              <Bone className="h-6 w-6 shrink-0" rounded="rounded-md" />
            </div>
          </div>

          {/* Right property panel */}
          <div className="flex w-36 shrink-0 flex-col gap-2 rounded-[14px] bg-base-300/70 p-3">
            <Bone className="h-4 w-16" rounded="rounded-md" />
            <div className="grid grid-cols-4 gap-1.5 py-1">
              {[0, 1, 2, 3].map((i) => (
                <Bone key={i} className="aspect-square" rounded="rounded-md" />
              ))}
            </div>
            <Bone className="h-2.5 w-full" rounded="rounded-full" />
            <Bone className="h-2.5 w-4/5" rounded="rounded-full" />
            <Bone className="h-2.5 w-3/5" rounded="rounded-full" />
            <Bone className="mt-auto h-8 w-full" rounded="rounded-full" />
          </div>
        </div>
      </div>

      {/* Short centered note: what this is and when it arrives */}
      <section className="flex max-w-xl flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          The Editor is being built
        </h1>
        <p className="flex items-center gap-2 text-sm font-bold text-base-content/60">
          <span
            className="badge badge-warning badge-sm h-5 shrink-0 gap-1 rounded-full border-0 px-2 font-extrabold text-[10px] uppercase tracking-[0.06em]"
            aria-label="Under construction"
          >
            <MagicWand className="size-2.5" aria-hidden />
            Under construction
          </span>
          <span>Coming soon to looms.</span>
        </p>
        <p className="text-sm leading-relaxed text-base-content/75">
          A full creation suite for skins and clothing pieces: paint pixel-perfect textures on a
          live 3D figure, build pieces layer by layer with pro pixel tools, and publish straight
          to the platform, all without leaving looms.
        </p>
        <p className="text-sm font-bold text-base-content/60">Check back soon.</p>
      </section>
    </div>
  )
}
