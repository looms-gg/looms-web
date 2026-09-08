export function GemMark({ className = "bg-primary" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 rotate-45 rounded-[2px] ${className}`}
    />
  )
}
