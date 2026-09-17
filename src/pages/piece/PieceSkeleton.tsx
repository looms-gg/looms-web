import { Bone } from "../../components/ui/Bone"

export function PieceSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading piece"
      role="status"
    >
      <Bone className="h-4 w-24" rounded="rounded-md" />

      <section className="overflow-hidden rounded-lg bg-base-200" aria-hidden>
        <div className="grid md:grid-cols-[minmax(280px,1fr)_minmax(0,1.05fr)]">
          <Bone className="min-h-[320px] w-full md:min-h-[440px]" />
          <div className="flex flex-col justify-center gap-5 p-6 md:p-8 lg:p-10">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Bone className="h-6 w-20" rounded="rounded-full" />
                <Bone className="h-6 w-16" rounded="rounded-full" delay={1} />
              </div>
              <Bone className="h-10 w-3/4 max-w-sm" rounded="rounded-lg" delay={1} />
              <Bone className="h-4 w-28" rounded="rounded-md" delay={2} />
            </div>
            <div className="space-y-2">
              <Bone className="h-3.5 w-full max-w-md" rounded="rounded-md" delay={2} />
              <Bone className="h-3.5 w-[85%] max-w-sm" rounded="rounded-md" delay={3} />
              <Bone className="h-3.5 w-[60%] max-w-xs" rounded="rounded-md" delay={4} />
            </div>
            <Bone className="h-4 w-32" rounded="rounded-md" delay={4} />
            <div className="flex flex-wrap gap-3 pt-1">
              <Bone className="size-11" rounded="rounded-full" delay={5} />
              <Bone className="h-11 w-40" rounded="rounded-full" delay={5} />
              <Bone className="h-11 w-28" rounded="rounded-full" delay={6} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
