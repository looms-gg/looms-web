import type { CSSProperties } from "react"

export function PieceSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading piece"
      role="status"
    >
      <div className="profile-bone h-4 w-24 rounded-md" aria-hidden />

      <section
        className="overflow-hidden rounded-[22px] bg-base-200"
        aria-hidden
      >
        <div className="grid md:grid-cols-[minmax(280px,1fr)_minmax(0,1.05fr)]">
          <div className="profile-bone min-h-[320px] w-full md:min-h-[440px]" />
          <div className="flex flex-col justify-center gap-5 p-6 md:p-8 lg:p-10">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="profile-bone h-6 w-20 rounded-full" />
                <div
                  className="profile-bone h-6 w-16 rounded-full"
                  style={{ "--i": 1 } as CSSProperties}
                />
              </div>
              <div
                className="profile-bone h-10 w-3/4 max-w-sm rounded-lg"
                style={{ "--i": 1 } as CSSProperties}
              />
              <div
                className="profile-bone h-4 w-28 rounded-md"
                style={{ "--i": 2 } as CSSProperties}
              />
            </div>
            <div className="space-y-2">
              <div
                className="profile-bone h-3.5 w-full max-w-md rounded-md"
                style={{ "--i": 2 } as CSSProperties}
              />
              <div
                className="profile-bone h-3.5 w-[85%] max-w-sm rounded-md"
                style={{ "--i": 3 } as CSSProperties}
              />
              <div
                className="profile-bone h-3.5 w-[60%] max-w-xs rounded-md"
                style={{ "--i": 4 } as CSSProperties}
              />
            </div>
            <div
              className="profile-bone h-4 w-32 rounded-md"
              style={{ "--i": 4 } as CSSProperties}
            />
            <div className="flex flex-wrap gap-3 pt-1">
              <div
                className="profile-bone size-11 rounded-full"
                style={{ "--i": 5 } as CSSProperties}
              />
              <div
                className="profile-bone h-11 w-40 rounded-full"
                style={{ "--i": 5 } as CSSProperties}
              />
              <div
                className="profile-bone h-11 w-28 rounded-full"
                style={{ "--i": 6 } as CSSProperties}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
