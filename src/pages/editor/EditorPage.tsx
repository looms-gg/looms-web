import { Link } from "react-router-dom"
import { MagicWand, PaintBrush, Stack, UploadSimple } from "@phosphor-icons/react"
import { Icon, type IconType } from "../../components/ui/Icon"

const DISCORD_URL = "https://discord.gg/UNTRgHBBPb"

const FEATURES: { icon: IconType; label: string }[] = [
  { icon: PaintBrush, label: "Paint pixel-perfect textures on a live 3D figure" },
  { icon: Stack, label: "Build pieces layer by layer with pro pixel tools" },
  { icon: UploadSimple, label: "Publish straight to the platform" },
]

function Bone({ className = "", rounded = "rounded-lg" }: { className?: string; rounded?: string }) {
  return <div aria-hidden className={`editor-bone ${rounded} ${className}`} />
}

/**
 * Editor — under construction.
 *
 * A teaser, not a workspace: a blank skeleton preview of the planned tool
 * (pure blobs, no text/icons inside it), beside a short note on what will ship.
 */
export function EditorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl py-2 sm:py-6">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        {/* Skeleton mockup of the future editor workspace (4:3) */}
        <div className="relative pb-12">
          <div
            className="editor-frame mx-auto aspect-[4/3] w-full rounded-[18px] bg-base-200 p-3"
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

          <span
            className="badge badge-warning badge-sm absolute -top-3 right-4 z-10 h-5 gap-1 rounded-full border-0 px-2 font-extrabold text-[10px] uppercase tracking-[0.06em]"
            aria-label="Under construction"
          >
            <MagicWand className="size-2.5" aria-hidden />
            Under construction
          </span>
        </div>

        {/* Left-aligned note: what this is and how to stay involved */}
        <section className="flex flex-col items-start gap-4 text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            The Editor, skin creation in the modern era
          </h1>
          <p className="max-w-[46ch] text-sm leading-relaxed text-base-content/75">
            A full creation suite for skins and clothing pieces. Coming soon to looms.
          </p>

          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature.label} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary/12 text-primary">
                  <Icon icon={feature.icon} className="size-4" />
                </span>
                <span className="text-sm font-semibold text-base-content/80">
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary rounded-full font-extrabold"
              title="Join the looms Discord community"
            >
              Join Discord
            </a>
            <Link to="/" className="btn btn-ghost rounded-full font-bold">
              Explore pieces
            </Link>
          </div>

          <p className="text-xs font-bold text-base-content/50">Check back soon.</p>
        </section>
      </div>
    </div>
  )
}
