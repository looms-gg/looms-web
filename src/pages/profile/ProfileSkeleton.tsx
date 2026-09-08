import type { CSSProperties } from "react"
import { RackGrid } from "../../components/piece/RackGrid"

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
          <div className="profile-bone h-36 w-full sm:h-44" />
          <div className="absolute -bottom-10 left-5 sm:left-6">
            <div className="profile-bone size-20 rounded-full border-4 border-base-200 sm:size-24" />
          </div>
        </div>
        <div className="space-y-3 px-5 pb-5 pt-14 sm:px-6">
          <div className="profile-bone h-8 w-44 max-w-full rounded-lg" />
          <div className="profile-bone h-3.5 w-28 rounded-md" />
          <div className="space-y-2 pt-1">
            <div className="profile-bone h-3.5 w-full max-w-md rounded-md" />
            <div className="profile-bone h-3.5 w-[66%] max-w-sm rounded-md" />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="profile-bone h-8 w-20 rounded-full"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>

      <div aria-hidden>
        <RackGrid>
          {Array.from({ length: TILE_COUNT }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-[18px] bg-neutral">
              <div
                className="profile-bone w-full"
                style={
                  {
                    aspectRatio: "4 / 3",
                    "--i": Math.min(i, 7),
                  } as CSSProperties
                }
              />
              <div className="space-y-2 bg-neutral px-4 pb-4 pt-3">
                <div
                  className="profile-bone h-4 w-3/4 rounded-md"
                  style={{ "--i": Math.min(i, 7) } as CSSProperties}
                />
                <div
                  className="profile-bone h-3 w-1/2 rounded-md"
                  style={{ "--i": Math.min(i + 1, 7) } as CSSProperties}
                />
              </div>
            </div>
          ))}
        </RackGrid>
      </div>
    </div>
  )
}
