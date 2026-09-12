import { RackGrid } from "../../components/piece/RackGrid"
import { Bone } from "../../components/ui/Bone"

const TILE_COUNT = 8

export function ProfileSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading profile"
      role="status"
    >
      <section className="overflow-hidden rounded-[18px] bg-base-200" aria-hidden>
        <div className="relative">
          <Bone className="h-36 w-full sm:h-44" />
          <div className="absolute -bottom-10 left-5 sm:left-6">
            <Bone className="size-20 border-4 border-base-200 sm:size-24" rounded="rounded-full" />
          </div>
        </div>
        <div className="space-y-3 px-5 pb-5 pt-14 sm:px-6">
          <Bone className="h-8 w-44 max-w-full" rounded="rounded-lg" />
          <Bone className="h-3.5 w-28" rounded="rounded-md" />
          <div className="space-y-2 pt-1">
            <Bone className="h-3.5 w-full max-w-md" rounded="rounded-md" />
            <Bone className="h-3.5 w-[66%] max-w-sm" rounded="rounded-md" />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-8 w-20" rounded="rounded-full" delay={i} />
        ))}
      </div>

      <div aria-hidden>
        <RackGrid>
          {Array.from({ length: TILE_COUNT }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-[18px] bg-neutral">
              <Bone
                className="w-full"
                style={{ aspectRatio: "4 / 3" }}
                delay={Math.min(i, 7)}
              />
              <div className="space-y-2 bg-neutral px-4 pb-4 pt-3">
                <Bone className="h-4 w-3/4" rounded="rounded-md" delay={Math.min(i, 7)} />
                <Bone
                  className="h-3 w-1/2"
                  rounded="rounded-md"
                  delay={Math.min(i + 1, 7)}
                />
              </div>
            </div>
          ))}
        </RackGrid>
      </div>
    </div>
  )
}
