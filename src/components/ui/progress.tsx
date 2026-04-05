import { cn } from "@/lib/utils"

type ProgressProps = {
  value?: number
  className?: string
  indicatorClassName?: string
}

function Progress({ value = 0, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className={cn("h-full bg-primary transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }
